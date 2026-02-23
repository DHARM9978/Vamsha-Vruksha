<?php
include "conn.php";
require "Navbar.php";

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

$nodes=[]; 
$edges=[]; 
$details=[];

if($selectedPerson){

    // Get all persons of same family
    $res = $conn->query("SELECT Family_Id FROM PERSON WHERE Person_Id=$selectedPerson");
    $row = $res->fetch_assoc();
    $familyId = $row['Family_Id'];

    $res = $conn->query("SELECT * FROM PERSON WHERE Family_Id=$familyId");

    $personIds = [];
    while($r=$res->fetch_assoc()){
        $personIds[] = $r['Person_Id'];
        $nodes[]=[
            'id'=>$r['Person_Id'],
            'label'=>$r['First_Name'].' '.$r['Last_Name'],
            'gender'=>$r['Gender']
        ];
        $details[$r['Person_Id']]=$r;
    }

    $idList = implode(',',$personIds);

    // Get only allowed relations
    $res = $conn->query("
        SELECT Person_Id, Related_Person_Id, Relation_Type
        FROM FAMILY_RELATION
        WHERE Person_Id IN ($idList)
        AND Related_Person_Id IN ($idList)
    ");

    $addedMarriage = [];

    while($r = $res->fetch_assoc()){

        $p1 = $r['Person_Id'];
        $p2 = $r['Related_Person_Id'];
        $type = $r['Relation_Type'];

        // ======================
        // Marriage (Horizontal)
        // ======================
        if($type == 'Husband-Wife' || $type == 'Wife-Husband'){

            $key = min($p1,$p2).'-'.max($p1,$p2);

            if(!isset($addedMarriage[$key])){
                $edges[] = [
                    'Person_Id'=>$p1,
                    'Related_Person_Id'=>$p2,
                    'Relation_Type'=>'Husband-Wife'
                ];
                $addedMarriage[$key] = true;
            }
        }

        // ======================
        // Parent → Child
        // ======================
        // Always ensure Parent → Child direction

    // ======================
// Parent → Child
// ======================

if($type == 'Father' || $type == 'Mother'){
    $edges[] = [
        'Person_Id'=>$p1,
        'Related_Person_Id'=>$p2,
        'Relation_Type'=>$type
    ];
}

if($type == 'Son' || $type == 'Daughter'){
    // reverse to parent → child direction
    $parentType = ($type == 'Son') ? 'Father' : 'Mother';

    $edges[] = [
        'Person_Id'=>$p2,
        'Related_Person_Id'=>$p1,
        'Relation_Type'=>$parentType
    ];
}


if($type == 'Son' || $type == 'Daughter'){
    // p2 is parent
    $edges[] = [
        'Person_Id'=>$p2,
        'Related_Person_Id'=>$p1,
        'Relation_Type'=>'Parent'
    ];
}

    }
}
?>

<link rel="stylesheet" href="../CSS/family_tree.css">

<?php if(!$selectedPerson): ?>

<div class="page-wrapper">
    <div class="glass-card">
        <h2>Select Family</h2>
        <?php
        $families = $conn->query("SELECT * FROM FAMILY ORDER BY Family_Name ASC");
        while($f=$families->fetch_assoc()):
        ?>
        <a href="?family=<?= $f['Family_Id'] ?>">
            <?= htmlspecialchars($f['Family_Name']) ?>
        </a><br>
        <?php endwhile; ?>
    </div>
</div>

<?php else: ?>

<div id="cy" style="width:100%;height:100vh;"></div>

<script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
<script src="https://unpkg.com/dagre/dist/dagre.min.js"></script>
<script src="https://unpkg.com/cytoscape-dagre/cytoscape-dagre.js"></script>

<script>
const nodes = <?= json_encode($nodes) ?>;
const edges = <?= json_encode($edges) ?>;

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
    elements: elements,
    style: [{
            selector: 'node',
            style: {
                'background-color': ele =>
                    ele.data('gender') === 'Male' ? '#2563eb' : '#ec4899',
                'label': 'data(label)',
                'color': '#fff',
                'text-valign': 'center',
                'text-halign': 'center',
                'width': 150,
                'height': 150
            }
        },
        {
    selector:'edge',
    style:{
        'curve-style':'bezier',
        'width':3,
        'line-color':'#64748b',
        'target-arrow-shape':'triangle',
        'target-arrow-color':'#64748b',
        'label':'data(label)',
        'font-size':14,
        'text-background-color':'#ffffff',
        'text-background-opacity':1,
        'text-background-padding':4,
        'text-rotation':'autorotate'
    }
},
{
    selector:'edge[label="Husband-Wife"]',
    style:{
        'target-arrow-shape':'none',
        'line-color':'#f59e0b',
        'width':4,
        'label':'Marriage'
    }
}

    ],
    layout:{
    name:'dagre',
    rankDir:'BT',     // Top to Bottom
    align:'UL',       // Important: keeps roots at top
    nodeSep:100,
    rankSep:180,
    edgeSep:20,
    animate:true
}

});
</script>

<?php endif; ?>