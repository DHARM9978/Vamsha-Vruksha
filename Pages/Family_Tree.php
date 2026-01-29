<?php
include "conn.php";
require "Navbar.php";

$selectedPerson = isset($_GET['id']) ? intval($_GET['id']) : null;
$searchResults = null;

/* ================= SEARCH ================= */
if(isset($_GET['q']) && trim($_GET['q']) !== ''){
    $q = "%".$_GET['q']."%";
    $stmt = $conn->prepare("
        SELECT Person_Id, First_Name, Last_Name 
        FROM PERSON 
        WHERE First_Name LIKE ? OR Last_Name LIKE ? OR Original_Native LIKE ?
    ");
    $stmt->bind_param("sss",$q,$q,$q);
    $stmt->execute();
    $searchResults = $stmt->get_result();
}

/* ================= BUILD DATASET (UNCHANGED LOGIC) ================= */
$nodes=[]; 
$edges=[]; 
$details=[];

if($selectedPerson){

    $res = $conn->query("SELECT Family_Id FROM PERSON WHERE Person_Id=$selectedPerson");
    $row = $res? $res->fetch_assoc() : null;
    $mainFamilyId = $row['Family_Id'] ?? 0;

    $finalIds = [];

    if($mainFamilyId){
        $res = $conn->query("SELECT Person_Id FROM PERSON WHERE Family_Id=$mainFamilyId");
        while($res && $r=$res->fetch_assoc()){
            $finalIds[$r['Person_Id']] = true;
        }
    }

    if(!empty($finalIds)){
        $mainIds = implode(',',array_keys($finalIds));

        $res = $conn->query("
            SELECT * FROM FAMILY_RELATION 
            WHERE Relation_Type IN ('Husband-Wife','Wife-Husband')
            AND (Person_Id IN ($mainIds) OR Related_Person_Id IN ($mainIds))
        ");

        $spouses=[];
        while($res && $r=$res->fetch_assoc()){
            $spouse = isset($finalIds[$r['Person_Id']]) ? $r['Related_Person_Id'] : $r['Person_Id'];
            $finalIds[$spouse] = true;
            $spouses[] = $spouse;
        }

        if($spouses){
            $spouseList = implode(',',$spouses);
            $res = $conn->query("
                SELECT Related_Person_Id 
                FROM FAMILY_RELATION 
                WHERE Person_Id IN ($spouseList)
                AND Relation_Type IN ('Father','Mother','Son','Daughter')
            ");

            $parents=[];
            while($res && $r=$res->fetch_assoc()){
                $finalIds[$r['Related_Person_Id']] = true;
                $parents[] = $r['Related_Person_Id'];
            }

            if($parents){
                $parentList = implode(',',$parents);
                $res = $conn->query("
                    SELECT * FROM FAMILY_RELATION
                    WHERE Relation_Type IN ('Husband-Wife','Wife-Husband')
                    AND (Person_Id IN ($parentList) OR Related_Person_Id IN ($parentList))
                ");

                while($res && $r=$res->fetch_assoc()){
                    $partner = in_array($r['Person_Id'],$parents) ? $r['Related_Person_Id'] : $r['Person_Id'];
                    $finalIds[$partner] = true;
                }
            }
        }

        $idList = implode(',',array_keys($finalIds));

        /* ===== ONLY CHANGE: EXTENDED JOIN FOR EXTRA DETAILS ===== */
        $res = $conn->query("
            SELECT p.*, 
                   g.Gotra_Name, 
                   s.Sutra_Name, 
                   v.Vamsha_Name,
                   kd.Kula_Devatha_Name,
                   md.Mane_Devru_Name,
                   ps.Panchang_Sudhi_Name,
                   pv.Pooja_Vruksha_Name
            FROM PERSON p
            LEFT JOIN Gothra g ON p.Gotra_Id=g.Gotra_Id
            LEFT JOIN Sutra s ON p.Sutra_Id=s.Sutra_Id
            LEFT JOIN Vamsha v ON p.Vamsha_Id=v.Vamsha_Id
            LEFT JOIN Kula_Devatha kd ON p.Kula_Devatha_Id=kd.Kula_Devatha_Id
            LEFT JOIN Mane_Devru md ON p.Mane_Devru_Id=md.Mane_Devru_Id
            LEFT JOIN Panchang_Sudhi ps ON p.Panchang_Sudhi_Id=ps.Panchang_Sudhi_Id
            LEFT JOIN Pooja_Vruksha pv ON p.Pooja_Vruksha_Id=pv.Pooja_Vruksha_Id
            WHERE p.Person_Id IN ($idList)
        ");

        while($res && $r=$res->fetch_assoc()){
            $nodes[]=[
                'id'=>$r['Person_Id'],
                'label'=>$r['First_Name'].' '.$r['Last_Name'],
                'gender'=>$r['Gender']
            ];
            $details[$r['Person_Id']]=$r;
        }

        $res=$conn->query("
            SELECT * FROM FAMILY_RELATION
            WHERE Person_Id IN ($idList) AND Related_Person_Id IN ($idList)
        ");
        while($res && $r=$res->fetch_assoc()) $edges[]=$r;
    }
}
?>

<style>
.page-content {
    padding: 40px 20px;
}

.search-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.search-box {
    width: 100%;
    max-width: 600px;
    text-align: center;
}

.search-box input {
    width: 70%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.search-box button {
    padding: 10px 15px;
    background: #1e90ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.results a {
    display: block;
    margin: 6px 0;
    color: #1e90ff;
    text-decoration: none;
    font-weight: 600;
}

.family-list {
    max-width: 800px;
    margin: 30px auto;
}

.family-list a {
    text-decoration: none;
    color: #1e90ff;
    font-weight: 600;
}

#cy {
    height: calc(100vh - 120px);
}

/* Tooltip */
.tooltip-box {
    position: absolute;
    background: #fff;
    border: 1px solid #ddd;
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.15);
    font-size: 12px;
    display: none;
    z-index: 9999;
    max-width: 280px;
    line-height: 1.6;
}
</style>

<div class="page-content">

    <?php if(!$selectedPerson): ?>

    <div class="search-wrapper">
        <div class="search-box">
            <form>
                <h2>Search person name for family tree</h2><br>
                <input name="q" placeholder="Search person...">
                <button>Search</button>
            </form>

            <div class="results">
                <?php if($searchResults instanceof mysqli_result): ?>
                <?php while($p=$searchResults->fetch_assoc()): ?>
                <a href="?id=<?= $p['Person_Id'] ?>">
                    <?= $p['First_Name'].' '.$p['Last_Name'] ?>
                </a>
                <?php endwhile; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <div class="family-list">
        <h3>All Families</h3>
        <ol>
            <?php
$families = $conn->query("SELECT Family_Id, Family_Name FROM FAMILY ORDER BY Family_Name ASC");
while($f = $families->fetch_assoc()){
$personRes = $conn->query("SELECT Person_Id FROM PERSON WHERE Family_Id=".$f['Family_Id']." LIMIT 1");
$personRow = $personRes ? $personRes->fetch_assoc() : null;
$personId = $personRow['Person_Id'] ?? null;

if($personId){
echo '<li><a href="?id='.$personId.'">'.$f['Family_Name'].' (ID: '.$f['Family_Id'].')</a></li>';
}
}
?>
        </ol>
    </div>

    <?php endif; ?>

    <?php if($selectedPerson): ?>
    <div id="tooltip" class="tooltip-box"></div>
    <div id="cy"></div>
    <?php endif; ?>

</div>

<?php if($selectedPerson): ?>
<script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/dagre/dist/dagre.min.js"></script>
<script src="https://unpkg.com/cytoscape-dagre/cytoscape-dagre.js"></script>

<script>
const nodes = <?= json_encode($nodes) ?>;
const edges = <?= json_encode($edges) ?>;
const details = <?= json_encode($details) ?>;

let elements = [];

nodes.forEach(n => {
    elements.push({
        data: {
            id: String(n.id),
            label: n.label,
            gender: n.gender
        }
    });
});

edges.forEach(e => {
    elements.push({
        data: {
            source: String(e.Person_Id),
            target: String(e.Related_Person_Id),
            label: e.Relation_Type
        }
    });
});

const cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [{
            selector: 'node',
            style: {
                'background-color': ele => ele.data('gender') == 'Male' ? '#1e90ff' : '#ff69b4',
                'label': 'data(label)',
                'width': 90,
                'height': 90,
                'text-valign': 'center',
                'text-halign': 'center',
                'color': '#fff',
                'font-size': '10px'
            }
        },
        {
            selector: 'edge',
            style: {
                'line-color': '#999',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '8px'
            }
        }
    ],
    layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 80,
        edgeSep: 40,
        rankSep: 120,
        animate: true
    }
});

/* ===== HOVER TOOLTIP (ONLY NEW FEATURE) ===== */

const tooltip = document.getElementById('tooltip');

cy.on('mouseover', 'node', function(evt) {
    const id = evt.target.id();
    const p = details[id];

    if (p) {
        tooltip.innerHTML = `
<b>Name:</b> ${p.First_Name} ${p.Last_Name}<br>
<b>Gender:</b> ${p.Gender ?? '-'}<br>
<b>Native:</b> ${p.Original_Native ?? '-'}<br><br>

<b>Gothra:</b> ${p.Gotra_Name ?? '-'}<br>
<b>Sutra:</b> ${p.Sutra_Name ?? '-'}<br>
<b>Vamsha:</b> ${p.Vamsha_Name ?? '-'}<br>
<b>Kula Devatha:</b> ${p.Kula_Devatha_Name ?? '-'}<br>
<b>Mane Devru:</b> ${p.Mane_Devru_Name ?? '-'}<br>
<b>Panchang Sudhi:</b> ${p.Panchang_Sudhi_Name ?? '-'}<br>
<b>Pooja Vruksha:</b> ${p.Pooja_Vruksha_Name ?? '-'}
`;
        tooltip.style.display = 'block';
    }
});

cy.on('mousemove', function(e) {
    tooltip.style.left = e.originalEvent.pageX + 15 + 'px';
    tooltip.style.top = e.originalEvent.pageY + 15 + 'px';
});

cy.on('mouseout', 'node', function() {
    tooltip.style.display = 'none';
});
</script>
<?php endif; ?>