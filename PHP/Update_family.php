<?php
include "../Pages/conn.php";

/* ================= AJAX ================= */
if (isset($_GET['action'])) {

    header('Content-Type: application/json');

    /* 🔍 LIVE SEARCH */
    if ($_GET['action'] == "search") {

        $q = "%" . ($_GET['q'] ?? "") . "%";

        $stmt = $conn->prepare("
            SELECT Family_Id, Family_Name, Reference_Id 
            FROM FAMILY 
            WHERE Family_Name LIKE ? 
            OR CAST(Reference_Id AS CHAR) LIKE ?
        ");

        $stmt->bind_param("ss", $q, $q);
        $stmt->execute();

        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        exit;
    }

    /* 📋 LOAD FULL DATA */
    if ($_GET['action'] == "get") {

        $fid = intval($_GET['id']);

        $family = $conn->query("SELECT * FROM FAMILY WHERE Family_Id=$fid")->fetch_assoc();

        $person = $conn->query("
            SELECT * FROM PERSON 
            WHERE Family_Id=$fid 
            ORDER BY Person_Id ASC LIMIT 1
        ")->fetch_assoc();

        echo json_encode([
            "family" => $family,
            "person" => $person
        ]);
        exit;
    }
}

/* ================= UPDATE ================= */
if (isset($_POST['action']) && $_POST['action'] == "update") {

    $conn->begin_transaction();

    try {

        /* FAMILY UPDATE */
        $stmt = $conn->prepare("
            UPDATE FAMILY 
            SET Family_Name=?, Native_Place=?, Head_DOB=?, Gotra_Id=?, Reference_Id=?
            WHERE Family_Id=?
        ");

        $stmt->bind_param("sssiii",
            $_POST['family_name'],
            $_POST['native'],
            $_POST['dob'],
            $_POST['gotra'],
            $_POST['reference_id'],
            $_POST['family_id']
        );
        $stmt->execute();

        /* PERSON UPDATE */
        $stmt = $conn->prepare("
            UPDATE PERSON SET
            First_Name=?, Last_Name=?, father_name=?, mother_name=?,
            Gender=?, DOB=?, Phone_Number=?, Mobile_Number=?, Email=?,
            Original_Native=?, Current_Address=?,
            Gotra_Id=?, Sutra_Id=?, Panchang_Sudhi_Id=?, Vamsha_Id=?,
            Mane_Devru_Id=?, Kula_Devatha_Id=?, Pooja_Vruksha_Id=?
            WHERE Person_Id=?
        ");

        $stmt->bind_param("sssssssssssiiiiiiii",
            $_POST['first_name'],
            $_POST['last_name'],
            $_POST['father_name'],
            $_POST['mother_name'],
            $_POST['gender'],
            $_POST['dob'],
            $_POST['phone'],
            $_POST['mobile'],
            $_POST['email'],
            $_POST['native'],
            $_POST['address'],
            $_POST['gotra'],
            $_POST['sutra'],
            $_POST['panchang'],
            $_POST['vamsha'],
            $_POST['mane_devru'],
            $_POST['kula_devatha'],
            $_POST['pooja_vruksha'],
            $_POST['person_id']
        );

        $stmt->execute();

        $conn->commit();

        echo json_encode(["status" => "success"]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error"]);
    }

    exit;
}
?>