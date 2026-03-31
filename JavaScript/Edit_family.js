const API = "../PHP/Update_family.php";
console.log("JS LOADED");

/* 🔍 LIVE SEARCH */
document.getElementById("search").addEventListener("input", function(){

    let query = this.value.trim();
    let box = document.getElementById("results");

    if(query === ""){
        box.innerHTML = "";
        return;
    }

    fetch(`${API}?action=search&q=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {

        box.innerHTML = "";

        if(data.length === 0){
            box.innerHTML = "<div>No family found</div>";
            return;
        }

        data.forEach(f => {

            let div = document.createElement("div");
            div.innerText = `${f.Family_Name} (Ref: ${f.Reference_Id})`;

            div.onclick = () => loadFamily(f.Family_Id);

            box.appendChild(div);
        });
    });
});

/* 🔘 BUTTON */
document.getElementById("searchBtn").addEventListener("click", function(){
    document.getElementById("search").dispatchEvent(new Event("input"));
});

/* 📋 LOAD DATA */
function loadFamily(id){

    fetch(`${API}?action=get&id=${id}`)
    .then(res => res.json())
    .then(d => {

        document.getElementById("form").classList.remove("hidden");

        let f=d.family;
        let p=d.person;

        family_id.value=f.Family_Id;
        family_name.value=f.Family_Name;
        reference_id.value=f.Reference_Id;
        native.value=f.Native_Place;

        person_id.value=p.Person_Id;
        first_name.value=p.First_Name;
        last_name.value=p.Last_Name;
        father_name.value=p.father_name;
        mother_name.value=p.mother_name;
        gender.value=p.Gender;
        dob.value=p.DOB;
        phone.value=p.Phone_Number;
        mobile.value=p.Mobile_Number;
        email.value=p.Email;
        address.value=p.Current_Address;

        gotra.value=p.Gotra_Id;
        sutra.value=p.Sutra_Id;
        panchang.value=p.Panchang_Sudhi_Id;
        vamsha.value=p.Vamsha_Id;
        mane_devru.value=p.Mane_Devru_Id;
        kula_devatha.value=p.Kula_Devatha_Id;
        pooja_vruksha.value=p.Pooja_Vruksha_Id;

        document.getElementById("results").innerHTML="";
    });
}

/* 💾 UPDATE */
function updateFamily(){

    let formData = new FormData();
    formData.append("action","update");

    document.querySelectorAll("#form input, #form select").forEach(el=>{
        if(el.id){
            formData.append(el.id, el.value);
        }
    });

    fetch(API,{
        method:"POST",
        body:formData
    })
    .then(res=>res.json())
    .then(res=>{
        if(res.status==="success"){
            alert("Family Updated Successfully ✅");
        } else {
            alert("Update Failed ❌");
        }
    });
}