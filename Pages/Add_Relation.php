<?php
// ---------- AJAX HANDLER ----------
if (isset($_POST['action'])) {

    include "conn.php";
    header('Content-Type: application/json');

    // ===========================
    // SEARCH FAMILY
    // ===========================
    if ($_POST['action'] == 'searchFamily') {

        $q = "%".$_POST['family']."%";

        $stmt = $conn->prepare("SELECT Family_Id, Family_Name FROM FAMILY WHERE Family_Name LIKE ?");
        $stmt->bind_param("s",$q);
        $stmt->execute();
        $res = $stmt->get_result();

        $data=[];
        while($row=$res->fetch_assoc()) {
            $data[]=$row;
        }

        echo json_encode($data);
        exit;
    }

    // ===========================
    // LOAD MEMBERS
    // ===========================
    if ($_POST['action'] == 'getMembers') {

        $fid = intval($_POST['familyId']);

        $stmt = $conn->prepare("SELECT Person_Id, First_Name, Last_Name FROM PERSON WHERE Family_Id=?");
        $stmt->bind_param("i",$fid);
        $stmt->execute();
        $res = $stmt->get_result();

        $data=[];
        while($row=$res->fetch_assoc()) {
            $data[]=$row;
        }

        echo json_encode($data);
        exit;
    }

    // ===========================
    // ADD RELATION (MAIN LOGIC)
    // ===========================
    if ($_POST['action'] == 'addRelation') {

        $p1  = intval($_POST['p1']);
        $p2  = intval($_POST['p2']);
        $rel = $_POST['relation'];

        // Prevent self relation
        if($p1 == $p2){
            echo json_encode(['success'=>false,'message'=>'Cannot relate person to themselves']);
            exit;
        }

        // Check duplicate relation
        $check = $conn->prepare("
            SELECT * FROM FAMILY_RELATION 
            WHERE Person_Id=? AND Related_Person_Id=?
        ");
        $check->bind_param("ii",$p1,$p2);
        $check->execute();
        $result = $check->get_result();

        if($result->num_rows > 0){
            echo json_encode(['success'=>false,'message'=>'Relation already exists']);
            exit;
        }

        // Get gender of both persons
        $gstmt = $conn->prepare("SELECT Person_Id, Gender FROM PERSON WHERE Person_Id IN (?,?)");
        $gstmt->bind_param("ii",$p1,$p2);
        $gstmt->execute();
        $gresult = $gstmt->get_result();

        $gender = [];
        while($row = $gresult->fetch_assoc()){
            $gender[$row['Person_Id']] = $row['Gender'];
        }

        $g1 = $gender[$p1] ?? "";
        $g2 = $gender[$p2] ?? "";

        // Determine reverse relation
        $reverseRelation = "";

        switch($rel) {

            case "Father":
                $reverseRelation = ($g2 == "Male") ? "Son" : "Daughter";
                break;

            case "Mother":
                $reverseRelation = ($g2 == "Male") ? "Son" : "Daughter";
                break;

            case "Son":
                $reverseRelation = ($g2 == "Male") ? "Father" : "Mother";
                break;

            case "Daughter":
                $reverseRelation = ($g2 == "Male") ? "Father" : "Mother";
                break;

            case "Brother":
                $reverseRelation = ($g2 == "Male") ? "Brother" : "Sister";
                break;

            case "Sister":
                $reverseRelation = ($g2 == "Male") ? "Brother" : "Sister";
                break;

            case "Husband-Wife":
                $reverseRelation = "Wife-Husband";
                break;

            case "Wife-Husband":
                $reverseRelation = "Husband-Wife";
                break;

            default:
                $reverseRelation = $rel;
        }

        // Use transaction (important!)
        $conn->begin_transaction();

        try {

            // Insert direct relation
            $stmt1 = $conn->prepare("
                INSERT INTO FAMILY_RELATION 
                (Person_Id, Related_Person_Id, Relation_Type, Created_At)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt1->bind_param("iis",$p1,$p2,$rel);
            $stmt1->execute();

            // Insert reverse relation
            $stmt2 = $conn->prepare("
                INSERT INTO FAMILY_RELATION 
                (Person_Id, Related_Person_Id, Relation_Type, Created_At)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt2->bind_param("iis",$p2,$p1,$reverseRelation);
            $stmt2->execute();

            $conn->commit();

            echo json_encode(['success'=>true]);

        } catch (Exception $e) {

            $conn->rollback();
            echo json_encode(['success'=>false,'message'=>'Insert failed']);
        }

        exit;
    }
}
?>

<?php require "Navbar.php"; ?>

<link rel="Stylesheet" href="../CSS/relation_page.css">

<div class="container">
    <h2>Add Relation</h2>

    <!-- Family 1 -->
    <div class="section">
        <div class="row">
            <input id="f1" placeholder="Search Family 1">
            <button onclick="searchFamily(1)">Search</button>

            <select id="family1" onchange="loadMembers(1)">
                <option value="">Select Family</option>
            </select>

            <select id="person1">
                <option value="">Select Person</option>
            </select>
        </div>
    </div>

    <!-- Family 2 -->
    <div class="section">
        <div class="row">
            <input id="f2" placeholder="Search Family 2">
            <button onclick="searchFamily(2)">Search</button>

            <select id="family2" onchange="loadMembers(2)">
                <option value="">Select Family</option>
            </select>

            <select id="person2">
                <option value="">Select Person</option>
            </select>
        </div>
    </div>

    <!-- Relation Type -->
    <div class="section">
        <div class="row">
            <select id="relation">
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Sister">Sister</option>
                <option value="Brother">Brother</option>
                <option value="Husband-Wife">Husband-Wife</option>
                <option value="Wife-Husband">Wife-Husband</option>
            </select>

            <button onclick="saveRelation()">Add Relation</button>
        </div>
    </div>
</div>

<script src="../JavaScript/Add_Relation_Functions.js"></script>
 