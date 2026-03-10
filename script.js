// 1. 初始化：自動填入日期時間
window.addEventListener('load', () => {
    const now = new Date();
    document.getElementById('date').value = now.toISOString().split('T')[0];
    document.getElementById('time').value = now.toTimeString().slice(0, 5);
});

let posterImg = null;

// 世界藝術風格資料庫
const ART_STYLES = [
    { name: "現代極簡", bg: "#FFFFFF", text: "#000000", accent: "#3B82F6", font: "Noto Sans TC" },
    { name: "梵谷星空", bg: "#0F2027", text: "#FFFFFF", accent: "#FFD700", font: "Noto Serif TC" },
    { name: "包浩斯潮流", bg: "#E0E0E0", text: "#1A1A1A", accent: "#EA3323", font: "Noto Sans TC" },
    { name: "莫蘭迪雅緻", bg: "#B5A397", text: "#4A4E69", accent: "#F2E9E4", font: "Noto Serif TC" },
    { name: "日系禪風", bg: "#F8F1E7", text: "#433D3C", accent: "#BC6C25", font: "Noto Serif TC" },
    { name: "賽博未來", bg: "#000000", text: "#00F5FF", accent: "#FF007F", font: "Noto Sans TC" }
];

// 2. 照片處理邏輯 (確保 globalImg 一定有東西)
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusText = document.getElementById('uploadStatus');
    const msg = document.getElementById('msg');
    statusText.innerText = "⏳ 正在載入照片...";

    // A. 立即載入原始圖作為保底
    const reader = new FileReader();
    reader.onload = (re) => {
        const img = new Image();
        img.onload = () => { 
            posterImg = img; 
            statusText.innerText = "✅ 照片已就緒";
            msg.innerText = "照片讀取成功，可點擊生成。";
        };
        img.src = re.target.result;
    };
    reader.readAsDataURL(file);

    // B. 背景去背 (異步執行)
    try {
        const blob = await Promise.race([
            imglyRemoveBackground(file),
            new Promise((_, j) => setTimeout(() => j(new Error("Timeout")), 10000))
        ]);
        posterImg = await createImageBitmap(blob);
        msg.innerText = "AI 去背完成，海報效果將更專業！";
    } catch (err) {
        msg.innerText = "環境不支援去背，將以原圖呈現。";
    }
});

// 3. 生成海報邏輯
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    // 嚴格檢查欄位並告知
    if (!key) return alert("請輸入您的 Gemini API Key！");
    if (!title) return alert("請輸入活動名稱！");
    if (!name) return alert("請輸入主講人姓名！");
    if (!posterImg) return alert("請上傳主講人照片！");

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    btnText.innerText = "AI 設計師正在構圖...";
    loader.classList.remove('hidden');

    const style = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
    let slogan = "創新突破，共創未來"; // 預設保底口號

    // 串接 Gemini v1 穩定版
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `活動名稱是「${title}」，主講人是「${name}」。請寫一句非常有質感的繁體中文海報標語（8個字以內），不要回傳任何英文或標點符號。` }] }]
            })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            slogan = data.candidates[0].content.parts[0].text.trim();
        }
    } catch (err) {
        console.warn("API 請求失敗，改用預設標語");
    }

    // 渲染海報
    render('pCanvas', title, name, slogan, style);
    render('lCanvas', title, name, slogan, style);

    // 顯示結果區域
    document.getElementById('resultArea').classList.remove('canvas-hidden');
    btnText.innerText = "立即生成宣傳海報";
    loader.classList.add('hidden');

    // 自動捲動到結果區
    window.scrollTo({ top: document.getElementById('resultArea').offsetTop, behavior: 'smooth' });
});

function render(id, title, name, slogan, style) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // A. 背景
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, w, h);

    // B. 隨機風格裝飾
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(w * Math.random(), h * 0.2, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // C. 繪製人物
    if (posterImg) {
        const ratio = isP ? (w * 0.9) / posterImg.width : (h * 0.85) / posterImg.height;
        const dw = posterImg.width * ratio;
        const dh = posterImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w * 0.55;
        const dy = h - dh;
        ctx.drawImage(posterImg, dx, dy, dw, dh);
    }

    // D. 文字排版 (繁體中文)
    ctx.fillStyle = style.text;
    ctx.textAlign = isP ? "center" : "left";
    const x = isP ? w / 2 : w * 0.08;

    // 活動名
    ctx.font = `900 ${w * 0.08}px "Noto Sans TC", sans-serif`;
    ctx.fillText(title, x, h * 0.16);

    // AI 標語
    ctx.fillStyle = style.accent;
    ctx.font = `700 ${w * 0.045}px "Noto Sans TC", sans-serif`;
    ctx.fillText(slogan, x, h * 0.23);

    // 講者名
    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.065}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`主講｜${name}`, x, h * 0.33);

    // 日期時間
    const date = document.getElementById('date').value.replace(/-/g, '/');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`${date} AT ${time}`, x, h * 0.40);

    // 外框裝飾
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `Poster-${id}-${Date.now()}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
