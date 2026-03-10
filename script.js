// 1. 初始化時間
window.onload = () => {
    const dt = new Date();
    document.getElementById('date').value = dt.toISOString().split('T')[0];
    document.getElementById('time').value = dt.toTimeString().slice(0, 5);
};

let globalImg = null;

const STYLES = [
    { name: "現代簡約", bg: "#FFFFFF", text: "#000000", accent: "#3B82F6", font: "Noto Sans TC" },
    { name: "黑金權威", bg: "#1A1A1A", text: "#FFFFFF", accent: "#D4AF37", font: "Noto Serif TC" },
    { name: "活力潮流", bg: "#FF3E00", text: "#FFFFFF", accent: "#000000", font: "Noto Sans TC" },
    { name: "和風雅緻", bg: "#F8F1E7", text: "#433D3C", accent: "#BC6C25", font: "Noto Serif TC" }
];

// 2. 照片處理 (極速保底版)
document.getElementById('photoUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('uploadStatus');
    const msg = document.getElementById('msg');
    
    statusText.innerText = "⌛ 處理中...";
    
    // 第一時間先讀取圖片，確保 globalImg 有東西
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            globalImg = img;
            statusText.innerText = "✅ 照片已就緒";
            msg.innerText = "照片讀取成功，可以開始生成。";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    // 後台嘗試去背 (不論成功失敗都不影響 globalImg 已有值)
    imglyRemoveBackground(file).then(blob => {
        return createImageBitmap(blob);
    }).then(result => {
        globalImg = result;
        msg.innerText = "AI 去背完成，效果更佳！";
    }).catch(err => {
        console.log("去背略過，使用原圖");
    });
});

// 3. 生成按鈕 (精準檢查版)
document.getElementById('generateBtn').addEventListener('click', async () => {
    // 獲取並修剪空白
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    // --- 精準檢查開始 ---
    if (!key) {
        alert("錯誤：請填入 Gemini API 金鑰！");
        return;
    }
    if (!title) {
        alert("錯誤：請填入活動名稱！");
        return;
    }
    if (!name) {
        alert("錯誤：請填入講者姓名！");
        return;
    }
    if (!globalImg) {
        alert("錯誤：請先上傳照片，並等待顯示「照片已就緒」！");
        return;
    }
    // --- 精準檢查結束 ---

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btnText.innerText = "AI 設計中...";
    loader.classList.remove('hidden');

    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    let slogan = "掌握趨勢，開創未來";

    try {
        // 使用 v1 穩定版 API 路徑
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `活動「${title}」，講者「${name}」。請寫一句繁體中文口號（8字內）。只回傳文字內容。` }] }]
            })
        });
        
        const resData = await resp.json();
        
        if (resData.error) {
            console.error("Gemini API 回報錯誤:", resData.error.message);
            // 雖然 API 錯了，但我們有保底 slogan，所以不中斷，繼續畫圖
        } else {
            slogan = resData.candidates[0].content.parts[0].text.trim();
        }
    } catch (err) {
        console.warn("網路或金鑰問題，改用預設標語繼續繪圖");
    }

    // 繪圖
    render('pCanvas', title, name, slogan, style);
    render('lCanvas', title, name, slogan, style);

    document.getElementById('resultArea').style.display = 'block';
    btnText.innerText = "生成宣傳海報";
    loader.classList.add('hidden');
    
    setTimeout(() => {
        window.scrollTo({ top: document.getElementById('resultArea').offsetTop, behavior: 'smooth' });
    }, 200);
});

function render(id, title, name, slogan, style) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // 底色
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // 裝飾
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.1, w * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 畫人
    if (globalImg) {
        const ratio = isP ? (w * 0.85) / globalImg.width : (h * 0.85) / globalImg.height;
        const dw = globalImg.width * ratio;
        const dh = globalImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w * 0.5;
        const dy = h - dh;
        ctx.drawImage(globalImg, dx, dy, dw, dh);
    }

    // 文字
    ctx.fillStyle = style.text;
    ctx.textAlign = isP ? "center" : "left";
    const x = isP ? w / 2 : w * 0.08;

    ctx.font = `900 ${w * 0.09}px "Noto Sans TC", sans-serif`;
    ctx.fillText(title, x, h * 0.18);

    ctx.fillStyle = style.accent;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC", sans-serif`;
    ctx.fillText(slogan, x, h * 0.25);

    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.07}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`主講｜${name}`, x, h * 0.35);

    const d = document.getElementById('date').value.replace(/-/g, '.');
    const t = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`${d} AT ${t}`, x, h * 0.43);

    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `Poster-${id}.png`;
    link.href = document.getElementById(id).toDataURL();
    link.click();
}
