async function printFamily() {

    const {
        jsPDF
    } = window.jspdf;
    const originalContent = document.getElementById("familyContent");

    if (!originalContent) {
        alert("Family content not found!");
        return;
    }

    // 🔥 STEP 1: Clone content
    const clone = originalContent.cloneNode(true);

    // 🔥 STEP 2: Create hidden container
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "fixed";
    hiddenContainer.style.top = "-9999px";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.width = "1200px"; // force desktop width
    hiddenContainer.appendChild(clone);

    document.body.appendChild(hiddenContainer);

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 300));

    // 🔥 STEP 3: Capture canvas from clone
    const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 1200
    });

    // 🔥 Remove clone immediately
    document.body.removeChild(hiddenContainer);

    // 🔥 STEP 4: Create PDF
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const margin = 10;
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;

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

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.9);

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
