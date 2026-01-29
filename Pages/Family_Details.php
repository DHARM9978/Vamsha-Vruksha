<?php
include "conn.php";
require "Navbar.php";

/* =========================================================
   ROOT PERSON DETECTION (UNCHANGED)
========================================================= */

$rootPerson = null;

if (isset($_GET['person']) && is_numeric($_GET['person'])) {

    $selected = intval($_GET['person']);

    $stmt = $conn->prepare("SELECT Family_Id FROM PERSON WHERE Person_Id=?");
    $stmt->bind_param("i", $selected);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();

    if ($row && $row['Family_Id']) {

        $familyId = $row['Family_Id'];

        $stmt = $conn->prepare("SELECT Person_Id FROM PERSON WHERE Family_Id=? ORDER BY Person_Id ASC LIMIT 1");
        $stmt->bind_param("i", $familyId);
        $stmt->execute();
        $headRes = $stmt->get_result();
        $headRow = $headRes->fetch_assoc();

        if ($headRow) {
            $rootPerson = $headRow['Person_Id'];
        }
    }
}

if (isset($_GET['family']) && is_numeric($_GET['family'])) {

    $familyId = intval($_GET['family']);

    $stmt = $conn->prepare("SELECT Person_Id FROM PERSON WHERE Family_Id=? ORDER BY Person_Id ASC LIMIT 1");
    $stmt->bind_param("i", $familyId);
    $stmt->execute();
    $headRes = $stmt->get_result();
    $headRow = $headRes->fetch_assoc();

    if ($headRow) {
        $rootPerson = $headRow['Person_Id'];
    }
}


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function getSpouse($id, $conn){
    $stmt = $conn->prepare("
        SELECT p.*
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON 
        ((fr.Person_Id=? AND p.Person_Id=fr.Related_Person_Id)
        OR
        (fr.Related_Person_Id=? AND p.Person_Id=fr.Person_Id))
        WHERE fr.Relation_Type IN ('Husband-Wife','Wife-Husband')
        LIMIT 1
    ");
    $stmt->bind_param("ii",$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();
    return ($r && $r->num_rows)?$r->fetch_assoc():null;
}


/* =========================================================
   🔥 ENHANCED PARENT DETECTION
   (Old logic preserved + indirect mother detection added)
========================================================= */

function getParents($id,$conn){

    $fatherId = null;
    $father = '-';
    $mother = '-';

    // Step 1: Direct lookup
    $stmt=$conn->prepare("
        SELECT p.Person_Id, p.First_Name, fr.Relation_Type
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON p.Person_Id =
        CASE 
            WHEN fr.Person_Id=? THEN fr.Related_Person_Id
            ELSE fr.Person_Id
        END
        WHERE (fr.Person_Id=? AND fr.Relation_Type IN ('Father','Mother'))
           OR (fr.Related_Person_Id=? AND fr.Relation_Type IN ('Son','Daughter'))
    ");

    $stmt->bind_param("iii",$id,$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();

    while($row=$r->fetch_assoc()){
        if($row['Relation_Type']=='Father'){
            $father=$row['First_Name'];
            $fatherId=$row['Person_Id'];
        }
        if($row['Relation_Type']=='Mother'){
            $mother=$row['First_Name'];
        }
    }

    // Step 2: If mother missing → infer via father → wife
    if($mother=='-' && $fatherId){

        $stmt=$conn->prepare("
            SELECT p.First_Name
            FROM FAMILY_RELATION fr
            JOIN PERSON p ON 
            ((fr.Person_Id=? AND p.Person_Id=fr.Related_Person_Id)
            OR
            (fr.Related_Person_Id=? AND p.Person_Id=fr.Person_Id))
            WHERE fr.Relation_Type IN ('Husband-Wife','Wife-Husband')
            LIMIT 1
        ");

        $stmt->bind_param("ii",$fatherId,$fatherId);
        $stmt->execute();
        $r2=$stmt->get_result();

        if($r2 && $r2->num_rows){
            $mother=$r2->fetch_assoc()['First_Name'];
        }
    }

    return [$father,$mother];
}


/* =========================================================
   CHILDREN & RECURSION (UNCHANGED)
========================================================= */

function getChildren($id,$conn){
    $list=[];
    $stmt=$conn->prepare("
        SELECT DISTINCT p.*
        FROM FAMILY_RELATION fr
        JOIN PERSON p ON
        ((fr.Person_Id=? AND fr.Relation_Type IN ('Son','Daughter') AND p.Person_Id=fr.Related_Person_Id)
        OR
        (fr.Related_Person_Id=? AND fr.Relation_Type IN ('Father','Mother') AND p.Person_Id=fr.Person_Id))
    ");
    $stmt->bind_param("ii",$id,$id);
    $stmt->execute();
    $r=$stmt->get_result();
    while($row=$r->fetch_assoc()) $list[]=$row;
    return $list;
}

function displayGeneration($personId,$conn,$level=1,&$counter=1){

    $children=getChildren($personId,$conn);

    foreach($children as $child){

        $spouse=getSpouse($child['Person_Id'],$conn);

        $spouseFather='-'; 
        $spouseMother='-';
        $spouseNative='-';

        if($spouse){
            list($spouseFather,$spouseMother)=getParents($spouse['Person_Id'],$conn);
            $spouseNative=$spouse['Original_Native'] ?? '-';
        }

        $padding=30*$level;

        echo "<tr>";
        echo "<td style='padding-left:{$padding}px;'>";

        if($level==1) echo $counter++.". ";

        echo htmlspecialchars($child['First_Name']." ".$child['Last_Name']);
        echo "</td>";

        echo "<td>";
        if($spouse){
            echo "<a href='?person=".$spouse['Person_Id']."' 
                    style='color:#1e90ff; font-weight:600; text-decoration:none;'>
                    ".htmlspecialchars($spouse['First_Name'])."
                  </a>";
        } else {
            echo "-";
        }
        echo "</td>";

        echo "<td>".$spouseNative."</td>";
        echo "<td>".$spouseFather."</td>";
        echo "<td>".$spouseMother."</td>";
        echo "</tr>";

        displayGeneration($child['Person_Id'],$conn,$level+1,$counter);
    }
}


/* =========================================================
   SEARCH & FAMILY LIST (UNCHANGED)
========================================================= */

$results=null;
if(isset($_GET['q']) && trim($_GET['q'])!=''){
    $s="%".$_GET['q']."%";
    $stmt=$conn->prepare("
        SELECT Person_Id, First_Name, Last_Name 
        FROM PERSON 
        WHERE First_Name LIKE ? OR Last_Name LIKE ?
    ");
    $stmt->bind_param("ss",$s,$s);
    $stmt->execute();
    $results=$stmt->get_result();
}

$familyList=$conn->query("SELECT Family_Id,Family_Name FROM FAMILY ORDER BY Family_Name ASC");
?>

<style>
body{ background:#f4f7fb; font-family:'Segoe UI',sans-serif; }
.page-content{ padding:100px 20px 40px; }
.card{ background:#fff; padding:30px; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,.08); margin-bottom:30px; }
h2{ text-align:center; color:#1e90ff; margin-bottom:20px; }
table{ width:100%; border-collapse:collapse; margin-top:20px; }
td{ padding:10px; border-bottom:1px solid #eee; }
.family-link{ display:block; padding:12px; border-radius:10px; background:#fff; border:1px solid #eaeaea; margin-bottom:10px; text-decoration:none; color:#333; font-weight:600; transition:.2s; }
.family-link:hover{ background:#1e90ff; color:#fff; }
</style>

<div class="page-content">

<?php if(!$rootPerson): ?>

<div class="card">
<h2>Search Person</h2>
<form style="text-align:center;">
<input name="q" placeholder="Search person..." required>
<button>Search</button>
</form>

<?php if($results): ?>
<?php while($p=$results->fetch_assoc()): ?>
<div style="text-align:center;margin-top:10px;">
<a href="?person=<?= $p['Person_Id'] ?>">
<?= htmlspecialchars($p['First_Name']." ".$p['Last_Name']) ?>
</a>
</div>
<?php endwhile; ?>
<?php endif; ?>
</div>

<div class="card">
<h2>All Families</h2>
<?php while($fam=$familyList->fetch_assoc()): ?>
<a class="family-link" href="?family=<?= $fam['Family_Id'] ?>">
<?= htmlspecialchars($fam['Family_Name']) ?> (ID: <?= $fam['Family_Id'] ?>)
</a>
<?php endwhile; ?>
</div>

<?php else: ?>

<?php
$head=$conn->query("SELECT * FROM PERSON WHERE Person_Id=$rootPerson")->fetch_assoc();
$spouse=getSpouse($head['Person_Id'],$conn);

$spouseFather='-'; 
$spouseMother='-';
$spouseNative='-';

if($spouse){
    list($spouseFather,$spouseMother)=getParents($spouse['Person_Id'],$conn);
    $spouseNative=$spouse['Original_Native'] ?? '-';
}
?>

<div class="card">
<h2><?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?> Family</h2>

<h3>Family Hierarchy</h3>

<table>
<tr>
<td><b>Name</b></td>
<td><b>Spouse</b></td>
<td><b>Spouse Native</b></td>
<td><b>Spouse Father</b></td>
<td><b>Spouse Mother</b></td>
</tr>

<tr>
<td><b><?= htmlspecialchars($head['First_Name'].' '.$head['Last_Name']) ?></b></td>
<td>
<?php if($spouse): ?>
<a href="?person=<?= $spouse['Person_Id'] ?>" 
   style="color:#1e90ff;font-weight:600;text-decoration:none;">
   <?= htmlspecialchars($spouse['First_Name']) ?>
</a>
<?php else: echo "-"; endif; ?>
</td>
<td><?= $spouseNative ?></td>
<td><?= $spouseFather ?></td>
<td><?= $spouseMother ?></td>
</tr>

<?php
$i=1;
displayGeneration($head['Person_Id'],$conn,1,$i);
?>

</table>

</div>

<?php endif; ?>

</div>
