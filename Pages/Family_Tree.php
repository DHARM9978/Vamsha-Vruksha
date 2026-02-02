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

<link rel="stylesheet" href="../CSS/family_tree.css">

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