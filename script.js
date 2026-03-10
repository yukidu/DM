// 1. 初始化時間
const now = new Date();
document.getElementById('date').value = now.toISOString().split('T')[0];
document.getElementById('time').value = now.toTimeString().slice(0, 5);

let globalImg = null;

// 保底設計方案 (當 API 失敗時使用)
const FALLBACK_DESIGNS = [
    { bgColor: "#1A1A1A", textColor: "#FFFFFF", accentColor: "#D4AF37", slogan: "尊榮體驗，啟發未來", fontStyle: "serif", layoutType: "center" },
    { bgColor: "#F8F1E7", textColor: "#433D3C", accentColor: "#BC6C25", slogan: "自然純粹，和諧共生", fontStyle: "serif", layoutType: "split" },
    { bgColor: "#FFFFFF", textColor: "#000000", accentColor: "#2563EB", slogan: "極致簡約，專注細節", fontStyle: "sans-serif", layoutType: "corner" }
];

// 2. 照片載入邏輯
document.getElementById('photoUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const uploadText = document.getElementById('uploadText');
    const dropZone = document.getElementById('dropZone');
    uploadText.innerText = "⏳ 照片載入中...";
    
    const img = new Image();
    img.onload = function() {
        globalImg = img;
        uploadText.innerText = "✅ 照片已就緒";
        dropZone.style.borderColor = "#3B82F6";
        dropZone.style.backgroundColor = "#EFF6FF";
    };
    img.src = URL.createObjectURL(file);
});

// 3. 生成按鈕邏輯
document.getElementById('generateBtn').addEventListener('click', () => callGeminiDesigner(false));
document.getElementById('randomStyleBtn').addEventListener('click', () => callGeminiDesigner(true));

async function callGeminiDesigner(isRandom) {
    const key = document.getElementById('apiKey').value.trim();
    const title = document.getElementById('eventTitle').value.trim();
    const name = document.getElementById('name').value.trim();

    if (!title || !name) return alert("請輸入活動名稱與姓名");
    if (!globalImg) return alert("請先上傳主講人照片！");

    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const aiStatus = document.getElementById('aiStatus');

    btnText.innerText = "AI 正在構思設計...";
    loader.classList.remove('hidden');

    // 隨機選一個風格作為 AI 的參考
    const vibes = ["梵谷", "包浩斯", "莫蘭迪", "賽博龐克", "瑞士極簡", "和風"];
    const chosenVibe = vibes[Math.floor(Math.random() * vibes.length)];

    let designResult = FALLBACK_DESIGNS[Math.floor(Math.random() * FALLBACK_DESIGNS.length)];

    // 如果有填 Key，才跑 AI 邏輯
    if (key) {
        try {
            const prompt = `你是一位資深平面設計師。活動「${title}」，講者「${name}」。
            風格目標：${isRandom ? chosenVibe : '自動決定'}。
            請決定設計基因，僅回傳 JSON 格式，不准有其他文字：
            {
              "bgColor": "背景色16進位",
              "textColor": "文字色16進位",
              "accentColor": "裝飾色16進位",
              "slogan": "8字內繁體中文標語",
              "fontStyle": "sans-serif或serif",
              "layoutType": "split或center或corner"
            }`;

            const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await resp.json();
            const rawText = data.candidates[0].content.parts[0].text;
            
            // 關鍵修正：使用正規表達式抓取 JSON，防止 AI 多廢話
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                designResult = JSON.parse(jsonMatch[0]);
                aiStatus.innerText = `✨ AI 設計完成：已套用「${designResult.slogan}」方案`;
            }
        } catch (err) {
            console.error("AI 串接失敗，切換至保底設計:", err);
            aiStatus.innerText = "⚠️ API 異常，已由系統自動產出精選設計";
        }
    } else {
        aiStatus.innerText = "💡 未輸入金鑰，系統隨機選配風格";
    }

    // 執行繪製 (無論如何都會執行到這裡)
    renderPoster('pCanvas', title, name, designResult);
    renderPoster('lCanvas', title, name, designResult);

    document.getElementById('resultArea').classList.remove('hidden');
    btnText.innerText = "啟動 AI 智能設計";
    loader.classList.add('hidden');
    
    setTimeout(() => {
        window.scrollTo({ top: document.getElementById('resultArea').offsetTop - 50, behavior: 'smooth' });
    }, 200);
}

function renderPoster(id, title, name, design) {
    const cvs = document.getElementById(id);
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const isP = h > w;

    // 1. 背景
    ctx.fillStyle = design.bgColor || "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // 2. 隨機裝飾元素 (AI 決定色彩)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = design.accentColor || "#CCCCCC";
    ctx.beginPath();
    ctx.arc(w * Math.random(), h * 0.2, w * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. 畫照片 (放在文字下方)
    if (globalImg) {
        const ratio = isP ? (w * 0.9) / globalImg.width : (h * 0.85) / globalImg.height;
        const dw = globalImg.width * ratio;
        const dh = globalImg.height * ratio;
        const dx = isP ? (w - dw) / 2 : w - dw;
        const dy = h - dh;
        ctx.drawImage(globalImg, dx, dy, dw, dh);
    }

    // 4. 畫文字
    ctx.fillStyle = design.textColor || "#000000";
    ctx.textAlign = (design.layoutType === "center" || isP) ? "center" : "left";
    const x = (ctx.textAlign === "center") ? w / 2 : w * 0.08;
    const fontMain = (design.fontStyle === "serif") ? "Noto Serif TC" : "Noto Sans TC";

    // 標題
    ctx.font = `900 ${w * 0.085}px "${fontMain}"`;
    ctx.fillText(title, x, h * 0.18);

    // 標語
    ctx.fillStyle = design.accentColor || "#666666";
    ctx.font = `700 ${w * 0.042}px "Noto Sans TC"`;
    ctx.fillText(design.slogan || "精彩活動，不容錯過", x, h * 0.25);

    // 講者
    ctx.fillStyle = design.textColor || "#000000";
    ctx.font = `900 ${w * 0.065}px "${fontMain}"`;
    ctx.fillText(`主講｜${name}`, x, h * 0.35);

    // 日期時間
    const date = document.getElementById('date').value.replace(/-/g, '/');
    const time = document.getElementById('time').value;
    ctx.font = `bold ${w * 0.035}px "Noto Sans TC"`;
    ctx.fillText(`${date} AT ${time}`, x, h * 0.42);

    // 邊框
    ctx.strokeStyle = design.accentColor || "#EEEEEE";
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, w - 80, h - 80);
}

function download(id) {
    const link = document.createElement('a');
    link.download = `AI海報-${Date.now()}.png`;
    link.href = document.getElementById(id).toDataURL('image/png');
    link.click();
}
