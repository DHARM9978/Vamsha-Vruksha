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
   HELPER FUNCTIONS (UNCHANGED)
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

function getParents($id,$conn){

    $fatherId = null;
    $father = '-';
    $mother = '-';

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
        $spouseGothra='-';

        if($spouse){
            list($spouseFather,$spouseMother)=getParents($spouse['Person_Id'],$conn);
            $spouseNative=$spouse['Original_Native'] ?? '-';

            $g=$conn->query("SELECT g.Gotra_Name FROM Gothra g 
                             JOIN PERSON p ON p.Gotra_Id=g.Gotra_Id 
                             WHERE p.Person_Id=".$spouse['Person_Id']);
            if($g && $g->num_rows){
                $spouseGothra=$g->fetch_assoc()['Gotra_Name'];
            }
        }

        $padding=30*$level;

        echo "<tr>";
        echo "<td style='padding-left:{$padding}px;'>";
        if($level==1) echo $counter++.". ";
        echo htmlspecialchars($child['First_Name']." ".$child['Last_Name']);
        echo "</td>";

        echo "<td>";
        if($spouse){
            echo "<a href='?person=".$spouse['Person_Id']."' class='spouse-link'>"
                 .htmlspecialchars($spouse['First_Name'])."</a>";
        } else echo "-";
        echo "</td>";

        echo "<td>".$spouseNative."</td>";
        echo "<td>".$spouseGothra."</td>";
        echo "<td>".$spouseFather."</td>";
        echo "<td>".$spouseMother."</td>";
        echo "</tr>";

        displayGeneration($child['Person_Id'],$conn,$level+1,$counter);
    }
}

/* ================= SEARCH ================= */

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

<link rel="stylesheet" href="../CSS/family_details.css">

<div class="page-wrapper">

    <?php if(!$rootPerson): ?>

    <div class="glass-card">
        <h2>Search Person and get Family Details</h2>
        <form class="search-box">
            <input name="q" placeholder="Search person..." required>
            <button>Search</button>
        </form>

        <?php if($results): ?>
        <?php while($p=$results->fetch_assoc()): ?>
        <div style="text-align:center;">
            <a href="?person=<?= $p['Person_Id'] ?>" class="result-link">
                <?= htmlspecialchars($p['First_Name']." ".$p['Last_Name']) ?>
            </a>
        </div>
        <?php endwhile; ?>
        <?php endif; ?>
    </div>

    <div class="glass-card">
        <h2>All Families</h2>
        <?php while($fam=$familyList->fetch_assoc()): ?>
        <a class="family-link" href="?family=<?= $fam['Family_Id'] ?>">
            <?= htmlspecialchars($fam['Family_Name']) ?> (ID: <?= $fam['Family_Id'] ?>)
        </a>
        <?php endwhile; ?>
    </div>

    <?php else: ?>

    <?php
$head=$conn->query("
SELECT p.*, 
       g.Gotra_Name, 
       s.Sutra_Name, 
       v.Vamsha_Name,
       ps.Panchang_Sudhi_Name,
       kd.Kula_Devatha_Name,
       md.Mane_Devru_Name,
       pv.Pooja_Vruksha_Name
FROM PERSON p
LEFT JOIN Gothra g ON p.Gotra_Id=g.Gotra_Id
LEFT JOIN Sutra s ON p.Sutra_Id=s.Sutra_Id
LEFT JOIN Vamsha v ON p.Vamsha_Id=v.Vamsha_Id
LEFT JOIN Panchang_Sudhi ps ON p.Panchang_Sudhi_Id=ps.Panchang_Sudhi_Id
LEFT JOIN Kula_Devatha kd ON p.Kula_Devatha_Id=kd.Kula_Devatha_Id
LEFT JOIN Mane_Devru md ON p.Mane_Devru_Id=md.Mane_Devru_Id
LEFT JOIN Pooja_Vruksha pv ON p.Pooja_Vruksha_Id=pv.Pooja_Vruksha_Id
WHERE p.Person_Id=$rootPerson
")->fetch_assoc();


$spouse=getSpouse($head['Person_Id'],$conn);

$spouseFather='-';
$spouseMother='-';
$spouseNative='-';
$spouseGothra='-';

if($spouse){
    list($spouseFather,$spouseMother)=getParents($spouse['Person_Id'],$conn);
    $spouseNative=$spouse['Original_Native'] ?? '-';

    $g=$conn->query("SELECT g.Gotra_Name FROM Gothra g 
                     JOIN PERSON p ON p.Gotra_Id=g.Gotra_Id 
                     WHERE p.Person_Id=".$spouse['Person_Id']);
    if($g && $g->num_rows){
        $spouseGothra=$g->fetch_assoc()['Gotra_Name'];
    }
}

?>

    <div class="glass-card">


        <br>
        <br>
        <div id="familyContent">

            <h2><?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?> Family</h2>

            <div class="head-horizontal">

                <div>
                    <span>Head</span>
                    <?= htmlspecialchars($head['First_Name']." ".$head['Last_Name']) ?>
                </div>

                <div>
                    <span>Spouse</span>
                    <?= $spouse ? htmlspecialchars($spouse['First_Name']) : '-' ?>
                </div>


                <div>
                    <span>Native</span>
                    <?= $head['Original_Native'] ?? '-' ?>
                </div>

                <div>
                    <span>Gothra</span>
                    <?= $head['Gotra_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Sutra</span>
                    <?= $head['Sutra_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Vamsha</span>
                    <?= $head['Vamsha_Name'] ?? '-' ?>
                </div>



                <div>
                    <span>Panchang Sudhi</span>
                    <?= $head['Panchang_Sudhi_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Kula Devatha</span>
                    <?= $head['Kula_Devatha_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Mane Devru</span>
                    <?= $head['Mane_Devru_Name'] ?? '-' ?>
                </div>

                <div>
                    <span>Pooja Vruksha</span>
                    <?= $head['Pooja_Vruksha_Name'] ?? '-' ?>
                </div>


            </div>


            <h3>Family Hierarchy</h3>

            <table>
                <tr>
                    <th>Name</th>
                    <th>Spouse</th>
                    <th>Spouse Native</th>
                    <th>Spouse Gothra</th>
                    <th>Spouse Father</th>
                    <th>Spouse Mother</th>
                </tr>

                <tr>
                    <td><b><?= htmlspecialchars($head['First_Name'].' '.$head['Last_Name']) ?></b></td>

                    <td>
                        <?php if($spouse): ?>
                        <a href="?person=<?= $spouse['Person_Id'] ?>" class="spouse-link">
                            <?= htmlspecialchars($spouse['First_Name']) ?>
                        </a>
                        <?php else: ?>-<?php endif; ?>
                    </td>

                    <td><?= $spouseNative ?></td>
                    <td><?= $spouseGothra ?></td>
                    <td><?= $spouseFather ?></td>
                    <td><?= $spouseMother ?></td>
                </tr>


                <?php
$i=1;
displayGeneration($head['Person_Id'],$conn,1,$i);
?>

            </table>
            <br>

        </div>


        <!-- End familyContent -->
        <div class="export-wrapper">
            <button onclick="printFamily()" class="export-btn">
                Download PDF
            </button>
        </div>



    </div>

    <?php endif; ?>

</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>



<script>
async function printFamily() {

    const {
        jsPDF
    } = window.jspdf;
    const content = document.getElementById("familyContent");

    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true // 🔥 Enable internal compression
    });

    const margin = 12;

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;

    // 🔥 Reduced scale from 2 → 1
    const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
    });

    const ratio = usableWidth / canvas.width;
    const pageHeightPx = Math.floor(usableHeight / ratio);

    let currentY = 0;
    let pageIndex = 0;

    while (currentY < canvas.height) {

        const sliceHeight = Math.min(pageHeightPx, canvas.height - currentY);

        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");

        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        ctx.drawImage(
            canvas,
            0,
            currentY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
        );

        // 🔥 PNG → JPEG (much smaller)
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.8);

        if (pageIndex > 0) {
            pdf.addPage();
        }

        const scaledHeight = sliceHeight * ratio;

        pdf.addImage(
            imgData,
            "JPEG",
            margin,
            margin,
            usableWidth,
            scaledHeight
        );

        currentY += sliceHeight;
        pageIndex++;
    }

    pdf.save("Family_Details.pdf");
}
</script>