// 自動填入時間
const now = new Date();
document.getElementById('date').value = now.toISOString().split('T')[0];
document.getElementById('time').value = now.toTimeString().slice(0, 5);

let finalImage = null;

// 風格資料庫
const artStyles = [
    { name: "極簡主義", bg: ["#FFFFFF", "#F2F2F2"], text: "#1A1A1A", accent: "#3B82F6" },
    { name: "大膽前衛", bg: ["#FFD60A", "#FFC300"], text: "#000000", accent: "#003566" },
    { name: "莫蘭迪藍", bg: ["#8E9AAF", "#CBC0D3"], text: "#FFFFFF", accent: "#EFD3D7" },
    { name: "賽博霓虹", bg: ["#0F0C29", "#302B63"], text: "#00F5FF", accent: "#FF007F" },
    { name: "和風質感", bg: ["#F8F1E7", "#E2D5C3"], text: "#433D3C", accent: "#BC6C25" }
];

// 照片上傳處理 (含去背與防當機)
document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('status');
    const uploadText = document.getElementById('uploadText');
    status.innerText = "正在處理照片中 (請稍候，勿關閉網頁)...";
    uploadText.innerText = "⌛ 處理中...";

    try {
        // 設定 10 秒超時，防止瀏覽器永久卡死
        const processedBlob = await Promise.race([
            imglyRemoveBackground(file),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000))
        ]);
        finalImage = await createImageBitmap(processedBlob);
        status.innerText = "去背成功！";
        uploadText.innerText = "✅ 照片已就緒";
    } catch (err) {
        console.error("去背失敗:", err);
        status.innerText = "去背失敗或超時，將使用原圖繼續。";
        uploadText.innerText = "⚠️ 使用原圖 (去背失敗)";
        // 失敗時使用原圖
        const reader = new FileReader();
        reader.onload = (re) => {
            const img = new Image();
            img.onload = () => { finalImage = img; };
            img.src = re.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 生成按鈕
document.getElementById('generateBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value;
    const title = document.getElementById('eventTitle').value;
    const name = document.getElementById('name').value;

    if (!key || !title || !name || !finalImage) {
        alert("請確認：1. API Key 2. 活動名 3. 姓名 4. 已上傳照片");
        return;
    }

    // 顯示載入動畫
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const status = document.getElementById('status');
    btnText.innerText = "AI 生成中";
    loader.classList.remove('hidden');

    const style = artStyles[Math.floor(Math.random() * artStyles.length)];

    try {
        // 串接 Gemini 1.5 Flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `你是一位廣告文案。活動名稱是「${title}」，主講人是「${name}」。請提供一句充滿吸引力的繁體中文口號（10字以內），不要有任何英文。` }] }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const slogan = data.candidates[0].content.parts[0].text.trim();

        // 繪製兩款海報
        render('portraitCanvas', title, name, slogan, style);
        render('landscapeCanvas', title, name, slogan, style);

        document.getElementById('resultArea').classList.remove('hidden');
        status.innerText = `生成成功！風格：${style.name}`;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    } catch (err) {
        alert("API 錯誤: " + err.message);
        status.innerText = "金鑰無效或 API 請求失敗。";
    } finally {
        btnText.innerText = "立即生成海報";
        loader.classList.add('hidden');
    }
});

function render(id, title, name, slogan, style) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const isPortrait = h > w;

    // 1. 背景漸層
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, style.bg[0]);
    grad.addColorStop(1, style.bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. 隨機裝飾色塊
    ctx.fillStyle = style.accent;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(w * Math.random(), h * Math.random(), w * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. 繪製人物
    if (finalImage) {
        const ratio = isPortrait ? (w * 0.9) / finalImage.width : (h * 0.8) / finalImage.height;
        const dw = finalImage.width * ratio;
        const dh = finalImage.height * ratio;
        const dx = isPortrait ? (w - dw) / 2 : w * 0.5;
        const dy = h - dh;
        ctx.drawImage(finalImage, dx, dy, dw, dh);
    }

    // 4. 文字內容
    ctx.fillStyle = style.text;
    ctx.textAlign = isPortrait ? "center" : "left";
    const x = isPortrait ? w / 2 : w * 0.05;

    // 活動名
    ctx.font = `900 ${w * 0.08}px "Noto Sans TC"`;
    ctx.fillText(title, x, h * 0.15);

    // 標語
    ctx.font = `700 ${w * 0.04}px "Noto Sans TC"`;
    ctx.fillStyle = style.accent;
    ctx.fillText(slogan, x, h * 0.22);

    // 姓名
    ctx.fillStyle = style.text;
    ctx.font = `900 ${w * 0.06}px "Noto Sans TC"`;
    ctx.fillText(`主講：${name}`, x, h * 0.32);

    // 時間日期
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.03}px "Noto Sans TC"`;
    ctx.fillText(`${date}｜${time}`, x, h * 0.4);

    // 邊框
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 15;
    ctx.strokeRect(30, 30, w - 60, h - 60);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `海報-${id}.png`;
    link.href = document.getElementById(id).toDataURL();
    link.click();
}
