<?php
include "conn.php";
require "Navbar.php";

/* =========================================================
   SUPPORT BOTH ?id= AND ?family=
========================================================= */

$selectedPerson = null;

if(isset($_GET['id']) && is_numeric($_GET['id'])){
    $selectedPerson = intval($_GET['id']);
}

if(isset($_GET['family']) && is_numeric($_GET['family'])){
    $fid = intval($_GET['family']);
    $res = $conn->query("SELECT Person_Id FROM PERSON WHERE Family_Id=$fid ORDER BY Person_Id ASC LIMIT 1");
    if($res && $res->num_rows){
        $row = $res->fetch_assoc();
        $selectedPerson = $row['Person_Id'];
    }
}

/* ================= SEARCH ================= */

$searchResults = null;

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

/* ================= LOAD FAMILIES ================= */

$familyList = $conn->query("SELECT Family_Id, Family_Name FROM FAMILY ORDER BY Family_Name ASC");

/* ================= BUILD DATASET (UNCHANGED) ================= */

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

    /* ===========================================
   🌿 VAMSHA VRUKSHA - FAMILY TREE GRAPH (PRO)
=========================================== */

:root {
    --primary-blue: #2563eb;
    --primary-green: #16a34a;
    --light-blue: #e0f2fe;
    --light-green: #ecfdf5;
    --soft-bg: #f8fafc;
    --border: #e2e8f0;
    --text-dark: #1e293b;
}

*{
    box-sizing:border-box;
}

body {
    margin: 0;
    font-family: "Segoe UI", system-ui;
    background: linear-gradient(135deg, var(--light-blue), #f0f9ff, var(--light-green));
    color: var(--text-dark);
    min-height:100vh;
}

/* ===== Page Wrapper ===== */
.page-wrapper {
    max-width: 1200px;
    margin: auto;
    padding: 120px 20px 60px;
}

/* ===== Glass Card ===== */
.glass-card {
    background: rgba(255, 255, 255, .92);
    backdrop-filter: blur(18px);
    border-radius: 24px;
    padding: clamp(25px,4vw,50px);
    margin-bottom: 40px;
    box-shadow: 0 25px 70px rgba(0, 0, 0, .08);
    transition:.3s;
}

.glass-card:hover{
    transform:translateY(-3px);
    box-shadow:0 30px 80px rgba(0,0,0,.12);
}

/* ===== Headings ===== */
h2 {
    text-align: center;
    margin-bottom: 30px;
    font-size: clamp(20px,4vw,28px);
    background: linear-gradient(90deg, var(--primary-blue), var(--primary-green));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* ===== Search Box ===== */
.search-box {
    display:flex;
    justify-content:center;
    gap:12px;
    flex-wrap:wrap;
}

.search-box input {
    flex:1;
    min-width:220px;
    max-width:500px;
    padding:14px;
    border-radius:16px;
    border:1px solid var(--border);
    background:var(--soft-bg);
    transition:.3s;
}

.search-box input:focus{
    border-color:var(--primary-blue);
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
    outline:none;
    background:white;
}

.search-box button {
    padding:14px 24px;
    border:none;
    border-radius:16px;
    background:linear-gradient(135deg,var(--primary-blue),var(--primary-green));
    color:white;
    font-weight:600;
    cursor:pointer;
    transition:.3s;
}

.search-box button:hover{
    transform:translateY(-2px);
    box-shadow:0 10px 25px rgba(37,99,235,.3);
}

/* ===== Result + Family Links ===== */
.result-link,
.family-link {
    display:block;
    padding:16px;
    border-radius:18px;
    background:white;
    margin-bottom:14px;
    text-decoration:none;
    color:var(--text-dark);
    font-weight:600;
    transition:.3s;
}

.result-link:hover,
.family-link:hover {
    transform:translateY(-3px);
    box-shadow:0 12px 28px rgba(37,99,235,.25);
}

/* ===== Graph Container ===== */
#cy {
    position:fixed;
    top:0;
    left:0;
    width:100%;
    height:100vh;
    background:linear-gradient(135deg,#eff6ff,#f0fdf4);
}

/* ===== Tooltip ===== */
.tooltip-box{
    position:absolute;
    padding:14px 18px;
    background:white;
    border-radius:16px;
    box-shadow:0 15px 40px rgba(0,0,0,.15);
    font-size:13px;
    display:none;
    z-index:1000;
    max-width:280px;
}

/* ===== Responsive ===== */
@media(max-width:768px){

    .glass-card{
        padding:22px;
        border-radius:20px;
    }

    .glass-card:hover{
        transform:none;
    }
}

@media(max-width:480px){

    .page-wrapper{
        padding:100px 15px 40px;
    }

    h2{
        font-size:18px;
    }

    .search-box{
        flex-direction:column;
        align-items:stretch;
    }

    .search-box button{
        width:100%;
    }
}

</style>

<?php if(!$selectedPerson): ?>

<div class="page-wrapper">

    <div class="glass-card">
        <h2>Search Person and get family Tree
            
        </h2>
        <form class="search-box">
            <input name="q" placeholder="Search person..." required>
            <button>Search</button>
        </form>

        <?php if($searchResults): ?>
        <?php while($p=$searchResults->fetch_assoc()): ?>
        <a href="?id=<?= $p['Person_Id'] ?>" class="result-link">
            <?= htmlspecialchars($p['First_Name']." ".$p['Last_Name']) ?>
        </a>
        <?php endwhile; ?>
        <?php endif; ?>
    </div>

    <div class="glass-card">
        <h2>All Families</h2>

        <?php while($fam=$familyList->fetch_assoc()): ?>
        <a class="family-link" href="?family=<?= $fam['Family_Id'] ?>">
            <?= htmlspecialchars($fam['Family_Name']) ?>
            (ID: <?= $fam['Family_Id'] ?>)
        </a>
        <?php endwhile; ?>

    </div>

</div>

<?php else: ?>

<div id="tooltip" class="tooltip-box"></div>
<div id="cy" style="position:fixed;top:0;left:0;width:100%;height:100vh;"></div>

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
                'background-color': ele => ele.data('gender') == 'Male' ? '#2563eb' : '#ec4899',
                'label': 'data(label)',
                'width': 150,
                'height': 160,
                'color': '#fff',
                'text-valign': 'center',
                'text-halign': 'center'
            }
        },
        {
            selector: 'edge',
            style: {
                'line-color': '#94a3b8',
                'target-arrow-shape': 'triangle',
                'label': 'data(label)'
            }
        }
    ],
    layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 90,
        rankSep: 140,
        animate: true
    }
});
</script>

<?php endif; ?>