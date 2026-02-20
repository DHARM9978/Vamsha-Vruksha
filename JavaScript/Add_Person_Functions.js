document.addEventListener("DOMContentLoaded", function () {

    /* ================= BASE URL ================= */
    const BASE_URL = window.location.pathname;

    /* ================= FAMILY SEARCH ================= */
    const fs = document.getElementById("familySearch");
    const fr = document.getElementById("familyResults");
    const pf = document.getElementById("personForm");
    const fid = document.getElementById("family_id");

    fs.addEventListener("input", function () {

        const q = fs.value.trim();
        if (!q) {
            fr.innerHTML = "";
            return;
        }

        fetch(`${BASE_URL}?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {

                fr.innerHTML = "";

                if (!Array.isArray(d) || d.length === 0) {
                    fr.innerHTML = "<div class='result'>No families found</div>";
                    return;
                }

                d.forEach(f => {

                    let x = document.createElement("div");
                    x.className = "result";
                    x.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    x.onclick = () => {

                        fid.value = f.Family_Id;
                        fr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;
                        pf.classList.remove("hidden");

                        loadMembers(f.Family_Id);

                        fetch(`${BASE_URL}?action=getFamilySpiritualData&family=${f.Family_Id}`)
                            .then(r => r.json())
                            .then(data => {

                                if (!data) return;

                                if (data.Gotra_Id) document.getElementById("gotra").value = data.Gotra_Id;
                                if (data.Sutra_Id) document.getElementById("sutra").value = data.Sutra_Id;
                                if (data.Panchang_Sudhi_Id) document.getElementById("panchang").value = data.Panchang_Sudhi_Id;
                                if (data.Vamsha_Id) document.getElementById("vamsha").value = data.Vamsha_Id;
                                if (data.Mane_Devru_Id) document.getElementById("mane_devru").value = data.Mane_Devru_Id;
                                if (data.Kula_Devatha_Id) document.getElementById("kula_devatha").value = data.Kula_Devatha_Id;
                                if (data.Pooja_Vruksha_Id) document.getElementById("pooja_vruksha").value = data.Pooja_Vruksha_Id;

                            });

                    };

                    fr.appendChild(x);
                });

            })
            .catch(err => {
                console.error("Family search error:", err);
            });

    });


    /* ================= LOAD MEMBERS ================= */
    function loadMembers(id) {

        fetch(`${BASE_URL}?action=loadMembers&family=${id}`)
            .then(r => r.json())
            .then(d => {

                const e = document.getElementById("familyMemberList");
                e.innerHTML = "";

                if (!Array.isArray(d)) return;

                d.forEach(p => {
                    let o = document.createElement("option");
                    o.value = p.Person_Id;
                    o.textContent = p.First_Name;
                    e.appendChild(o);
                });

            })
            .catch(err => {
                console.error("Load members error:", err);
            });
    }


    /* ================= FEMALE LOGIC ================= */
    const genderSelect = document.getElementById("gender");
    const femaleBox = document.getElementById("femaleBox");
    const marriedSelect = document.getElementById("married");
    const marriageBox = document.getElementById("marriageBox");

    genderSelect.addEventListener("change", function () {
        if (this.value === "Female") {
            femaleBox.classList.remove("hidden");
        } else {
            femaleBox.classList.add("hidden");
            marriageBox.classList.add("hidden");
        }
    });

    marriedSelect.addEventListener("change", function () {
        if (this.value === "yes") {
            marriageBox.classList.remove("hidden");
        } else {
            marriageBox.classList.add("hidden");
        }
    });


    /* ================= HUSBAND SEARCH ================= */
    const hfs = document.getElementById("husbandFamilySearch");
    const hfr = document.getElementById("husbandFamilyResults");

    hfs.addEventListener("input", function () {

        const q = hfs.value.trim();
        if (!q) {
            hfr.innerHTML = "";
            return;
        }

        fetch(`${BASE_URL}?action=searchFamily&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => {

                hfr.innerHTML = "";

                if (!Array.isArray(d)) return;

                d.forEach(f => {

                    let div = document.createElement("div");
                    div.className = "result";
                    div.textContent = `${f.Family_Name} (${f.Native_Place})`;

                    div.onclick = () => {

                        hfr.innerHTML = `<div class="selected-family">✔ ${f.Family_Name}</div>`;

                        fetch(`${BASE_URL}?action=loadMembers&family=${f.Family_Id}&gender=Male`)
                            .then(r => r.json())
                            .then(members => {

                                const husbandList = document.getElementById("husbandList");
                                husbandList.innerHTML = "";

                                if (!Array.isArray(members)) return;

                                members.forEach(p => {
                                    let option = document.createElement("option");
                                    option.value = p.Person_Id;
                                    option.textContent = p.First_Name;
                                    husbandList.appendChild(option);
                                });

                            });

                    };

                    hfr.appendChild(div);
                });

            })
            .catch(err => {
                console.error("Husband search error:", err);
            });

    });

});
