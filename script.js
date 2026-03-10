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
              "bgColor": "背景色16進
