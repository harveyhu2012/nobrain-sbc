// ==UserScript==
// @name         EAFC 26 Nobrain SBC
// @namespace    http://tampermonkey.net/
// @version      0.29
// @description  SBC求解器，贪心+爬山算法 / SBC solver using greedy + hill climbing
// @author       Harvey Hu
// @match        https://www.easports.com/*/ea-sports-fc/ultimate-team/web-app/*
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      fut.gg
// @connect      pages.dev
// @connect      enhancer-api.futnext.com
// ==/UserScript==

GM_addStyle(`
    #NotificationLayer {
        top: 120px !important;
        bottom: auto !important;
    }
    .aisbc-offline-progress {
        position: absolute;
        bottom: 38%;
        left: 0;
        right: 0;
        text-align: center;
        color: #fff;
        font-size: 13px;
        pointer-events: none;
    }
    .aisbc-price-label {
        position: absolute;
        font-size: 12px;
        width: auto !important;
        padding: 0 0.2rem;
        left: 50%;
        bottom: 5%;
        transform: translateX(-50%) !important;
        white-space: nowrap;
        color: #f5c518;
        background: rgba(0,0,0,0.55);
        padding: 0 3px;
        border-radius: 3px;
        pointer-events: none;
        z-index: 2;
    }
    .aisbc-price-label.precious {
        background: #ee2208;
        border: 1px solid #fd7254;
        color: #fff;
    }
    .aisbc-settings-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .aisbc-settings-card {
        background: var(--ut-color-background-primary, #1a1a2e);
        color: var(--ut-color-text-primary, #fff);
        border-radius: 8px;
        padding: 24px;
        min-width: 320px;
        max-width: 480px;
        width: 90%;
        height: 70vh;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .aisbc-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.15);
        padding-bottom: 8px;
    }
    .aisbc-tab {
        padding: 4px 12px;
        font-size: 12px;
        cursor: pointer;
        border-radius: 4px;
        opacity: 0.6;
        background: transparent;
        border: none;
        color: inherit;
    }
    .aisbc-tab.active {
        opacity: 1;
        background: rgba(255,255,255,0.12);
    }
    .aisbc-tab-panel { display: none; flex: 1; overflow-y: auto; min-height: 0; }
    .aisbc-tab-panel.active { display: flex; flex-direction: column; }
    .aisbc-settings-card h2 {
        margin: 0 0 16px;
        font-size: 16px;
        font-weight: bold;
    }
    .aisbc-settings-card h3 {
        margin: 16px 0 8px;
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
        opacity: 0.6;
        border-bottom: 1px solid rgba(255,255,255,0.15);
        padding-bottom: 4px;
    }
    .aisbc-settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 13px;
    }
    .aisbc-settings-row label { flex: 1; }
    .aisbc-settings-row .choicesLabel { font-size: 13px; }
    .aisbc-settings-row input[type=number] {
        width: 70px;
        background: var(--ut-color-background-secondary, #2a2a3e);
        color: inherit;
        border: 1px solid var(--ut-color-border, #444);
        border-radius: 4px;
        padding: 4px 6px;
        font-size: 13px;
    }
    .aisbc-settings-footer {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        justify-content: flex-end;
    }
    .ms-wrap { position:relative; color:#000; font-size:14px; }
    .ms-tags { display:flex; flex-wrap:wrap; gap:4px; min-height:30px; padding:4px; background:#f9f9f9; border:1px solid #ddd; border-radius:3px; cursor:pointer; }
    .ms-tag { display:inline-flex; align-items:center; gap:4px; background:#000; color:#fff; border-radius:14px; padding:2px 8px; font-size:12px; }
    .ms-tag img { width:20px; height:20px; border-radius:2px; }
    .ms-tag-x { cursor:pointer; margin-left:2px; font-size:14px; line-height:1; opacity:.8; }
    .ms-tag-x:hover { opacity:1; }
    .ms-dd { display:none; position:absolute; z-index:9999; left:0; right:0; top:100%; max-height:260px; overflow-y:auto; background:#fff; border:1px solid #bbb; border-top:none; border-radius:0 0 3px 3px; }
    .ms-wrap.ms-open .ms-dd { display:block; }
    .ms-search { display:block; width:100%; padding:6px 8px; border:none; border-bottom:1px solid #ddd; outline:none; font-size:13px; box-sizing:border-box; }
    .ms-opt { display:flex; align-items:center; gap:6px; padding:6px 10px; cursor:pointer; font-size:13px; }
    .ms-opt:hover { background:#f2f2f2; }
    .ms-opt.ms-selected { background:#e8e8e8; }
    .ms-opt img { width:24px; height:24px; border-radius:2px; }
    .ms-empty { padding:8px 10px; color:#999; font-size:13px; }
    .aisbc-exclude-section { margin-top:16px; }
    .aisbc-exclude-section h3 { font-size:13px; margin:0 0 8px; opacity:0.7; }
    .player.locked::before {
        font-family: 'UltimateTeam-Icons';
        position: absolute;
        content: '\\E09C';
        right: 4px;
        bottom: 18px;
        color: #d31332;
        font-size: 0.8em;
        z-index: 2;
    }
    .item-price {
        padding: 0 0.2rem;
        left: 50%;
        transform: translateX(-50%) !important;
        white-space: nowrap;
        background: #1e242a;
        border: 1px solid cornflowerblue;
        border-radius: 5px;
        position: absolute;
        z-index: 2;
        color: #fff;
    }
    .nobrain-panel-close {
        position: absolute;
        top: 0.35rem;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 1.2rem;
        cursor: pointer;
        line-height: 1;
        padding: 0;
    }
    .nobrain-buy-panel {
        padding: 0.75rem;
        background: rgba(17,24,39,0.9);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px;
        display: none;
        flex-direction: column;
        gap: 0.35rem;
        max-height: 80vh;
        overflow: hidden;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        min-width: 320px;
        box-shadow: 0 12px 24px rgba(0,0,0,0.45);
        box-sizing: border-box;
    }
    .nobrain-buy-content {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        overflow-y: auto;
        max-height: calc(80vh - 2.5rem);
    }
    .nobrain-buy-footer {
        margin-top: 0.5rem;
        font-size: 0.85rem;
        opacity: 0.85;
        min-height: 1.2rem;
        text-align: center;
    }
    .nobrain-buy-title {
        font-weight: bold;
        margin-bottom: 0.35rem;
    }
    .nobrain-buy-header-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 0.5rem;
        font-weight: bold;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .nobrain-buy-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 0.5rem;
        align-items: center;
    }
`);

(function () {
    "use strict";

    // ─── i18n 本地化 / i18n Localization ─────────────────────────────────────────
    let aisbcLang = 0; // 0=中文, 1=English
    const aisbcLocale = {
        // 设置面板 / Settings panel
        "settings.title":               ["⚙ Nobrain SBC 设置", "⚙ Nobrain SBC Settings"],
        "settings.algo":                ["算法", "Algorithm"],
        "settings.exclude":             ["排除", "Exclude"],
        "settings.ui":                  ["界面", "UI"],
        "settings.tabPlayers":          ["排除球员", "Players"],
        "settings.save":                ["保存", "Save"],
        "settings.saved":               ["设置已保存", "Settings saved"],
        "settings.close":               ["关闭", "Close"],
        "settings.reset":               ["恢复初始", "Reset to Default"],
        "settings.resetDone":           ["设置已恢复默认", "Settings reset to default"],
        // 设置项标签 / Setting labels
        "param.excludeSbc":             ["排除 SBC 球员", "Exclude SBC Players"],
        "param.excludeObjective":       ["排除任务球员", "Exclude Objective Players"],
        "param.excludeSpecial":         ["排除特殊球员（周黑除外）", "Exclude Special Players (excl. TOTW)"],
        "param.excludeTradable":        ["排除可交易球员", "Exclude Tradable Players"],
        "param.excludeExtinct":         ["排除绝版球员", "Exclude Extinct Players"],
        "param.duplicateDiscount":      ["重复球员折扣 (%)", "Duplicate Discount (%)"],
        "param.untradeableDiscount":    ["不可交易折扣 (%)", "Untradeable Discount (%)"],
        "param.conceptPremium":         ["虚拟球员价格倍率 (%)", "Concept Player Price Premium (%)"],
        "param.hillClimbMaxIter":       ["爬山迭代次数", "Hill Climb Iterations"],
        "param.innerRestarts":          ["内部重启次数", "Inner Restarts"],
        "param.ilsNoImproveLimit":      ["ILS无改善上限", "ILS No-Improve Limit"],
        "param.maxPriceIncrements":     ["购买最大加价步数", "Max Price Increment Steps"],
        "param.showPrices":             ["显示球员价格", "Show Player Prices"],
        "param.priceExpiry":            ["价格缓存时间（分钟）", "Price Cache Duration (min)"],
        "param.apiProxy":               ["自定义 API 代理（留空使用内置随机代理）", "Custom API Proxy (leave blank for built-in)"],
        "btn.clearPriceCache":          ["清空价格缓存", "Clear Price Cache"],
        "btn.clearPriceCacheDone":      ["已清空", "Cleared"],
        "param.excludePlayers":         ["排除 - 球员", "EXCLUDE - Players"],
        // 批量购买 / Batch buy
        "btn.buySquad":                 ["批量购买", "Buy Squad"],
        "buy.colPlayer":                ["球员", "Player"],
        "buy.colExpected":              ["预期价格", "Expected"],
        "buy.colStatus":                ["状态", "Status"],
        "buy.successAt":                ["成功 @ %1", "Success @ %1"],
        "buy.title":                    ["批量购买虚拟球员", "Buying concept players"],
        "buy.queued":                   ["等待中", "Queued"],
        "buy.buying":                   ["购买中...", "Buying..."],
        "buy.success":                  ["成功", "Success"],
        "buy.failed":                   ["失败", "Failed"],
        "buy.missingPrice":             ["无价格", "No price"],
        "buy.noListing":                ["无挂牌", "No listing"],
        "buy.priceTooHigh":             ["价格过高", "Price too high"],
        "buy.skipped":                  ["市价%1 > 上限%2", "Market %1 > Limit %2"],
        "buy.bidRejected":              ["出价被拒", "Bid rejected"],
        "buy.alreadyOwned":             ["已拥有", "Already owned"],
        "buy.error":                    ["出错", "Error"],
        "buy.nextIn":                   ["下一个", "Next in"],
        "buy.closingIn":                ["即将关闭", "Closing soon"],
        "buy.closeToStop":              ["关闭窗口即停止购买", "Close window to stop"],
        "notify.noConcepts":            ["阵容中无虚拟球员", "No concept players in squad"],
        "notify.noCachedPrice":         ["无缓存价格", "No cached price"],
        "notify.noActiveListing":       ["无活跃挂牌", "No active listing"],
        "notify.priceTooHigh":          ["价格过高：%1 > %2", "Price too high: %1 > %2"],
        "notify.buySuccess":            ["购买成功 @ %1", "Bought @ %1"],
        "notify.buyFailed":             ["购买失败", "Buy failed"],
        "notify.buyAttempted":          ["已尝试购买 @ %1", "Buy attempted @ %1"],
        "notify.buyEncounterError":     ["购买出错", "Buy encountered error"],
        "notify.buyComplete":           ["购买完成：%1/%2 成功", "Buy complete: %1/%2 succeeded"],
        "misc.na":                      ["N/A", "N/A"],
        "misc.loading":                 ["加载中...", "Loading..."],
        "misc.closePanel":              ["关闭", "Close"],
        // 按钮 / Buttons
        "btn.solve":                    ["求解SBC", "Solve SBC"],
        "btn.conceptSolve":             ["虚拟求解", "Concept Solve"],
        "notify.fsuNotFound":           ["未检测到FSU插件", "FSU not detected"],
        "notify.fsuFillTimeout":        ["FSU填充超时", "FSU fill timed out"],
        "notify.fsuCredit":             ["虚拟球员填充调用了 Futcd_kcka 大大的【FSU】EAFC FUT WEB增强器提供的SBC模板填充功能，感谢！", "Squad autofill powered by Futcd_kcka's 【FSU】EAFC FUT WEB Enhancer SBC template feature. Thanks!"],
        "btn.sbcLock":                  ["SBC 锁定", "SBC Lock"],
        "btn.sbcUnlock":                ["SBC 解锁", "SBC Unlock"],
        // 通知 / Notifications
        "notify.solving":               ["开始求解...", "Solving..."],
        "notify.noPlayers":             ["俱乐部中未找到球员", "No players found in club"],
        "notify.saveFailed":            ["保存阵容失败", "Failed to save squad"],
        "notify.solved":                ["求解完成！", "Solved!"],
        "notify.noSquad":               ["无法获取阵容引用", "Cannot get squad reference"],
        "notify.noChallenge":           ["未找到挑战赛", "Challenge not found"],
        "notify.error":                 ["求解出错：%1", "Solve error: %1"],
        "notify.locked":                ["已设置 SBC 锁定", "SBC Lock set"],
        "notify.unlocked":              ["已解除 SBC 锁定", "SBC Lock removed"],
        // 进度 / Progress
        "progress.pct":                 ["求解进度：%1%", "Solving: %1%"],
        // 价格 / Price
        "price.extinct":                ["绝版", "EXTINCT"],
        // 多选 / Multiselect
        "ms.search":                    ["搜索... / Search...", "Search..."],
        "ms.placeholder":               ["点击选择... / Click to select...", "Click to select..."],
        "ms.empty":                     ["无结果 / No results", "No results"],
    };
    const L = (key, ...params) => {
        let text = aisbcLocale.hasOwnProperty(key) ? aisbcLocale[key][aisbcLang] : key;
        params.forEach((val, i) => { text = text.replace(`%${i + 1}`, String(val)); });
        return text;
    };

    // ─── 常量 / Constants ─────────────────────────────────────────────────────────
    const DEFAULT_SEARCH_BATCH_SIZE = 91;
    const HILL_CLIMB_MAX_ITER = 5000; // 默认值，运行时被设置覆盖 / fallback, overridden by settings at runtime

    // ─── ai-sbc脚本检测 / AI-SBC Detection ──────────────────────────────────────
    const isAiSBCRunning = () => typeof window.fetchLivePlayerPrice === 'function';

    // ─── FSU检测 / FSU Detection ─────────────────────────────────────────────────
    const isFSURunning = () => typeof unsafeWindow.events !== "undefined";
    // 获取FSU方案填充按钮（PC: cntlr.left，手机: 从子控制器找）
    // Get FSU fill squad button (PC: cntlr.left, mobile: search child controllers)
    const getFsuFillBtn = () => {
        const left = cntlr.left?.();
        if (left?._fsu?.fillSquadBtn) return left._fsu.fillSquadBtn;
        const cur = cntlr.current?.();
        if (cur?._fsu?.fillSquadBtn) return cur._fsu.fillSquadBtn;
        const navChildren = cur?.getNavigationController?.()?.childViewControllers || [];
        for (const c of navChildren) {
            if (c._fsu?.fillSquadBtn) return c._fsu.fillSquadBtn;
        }
        return null;
    };

    // ─── 工具函数 / Utilities ─────────────────────────────────────────────────────
    const showNotification = (message, type) => {
        const t = type !== undefined ? type : UINotificationType.POSITIVE;
        services.Notification.queue([message, t]);
    };

    const cntlr = {
        current() {
            return _appMain?._rootViewController?.currentController?.currentController?.currentController;
        },
        right() {
            return _appMain?._rootViewController?.currentController?.currentController?.currentController?.rightController?.currentController;
        },
        left() {
            return _appMain?._rootViewController?.currentController?.currentController?.currentController?.leftController;
        }
    };


    const showLoader = () => {
        const clickShield = document.querySelector(".ut-click-shield");
        if (clickShield) clickShield.classList.add("showing");
        const loaderIcon = document.querySelector(".loaderIcon");
        if (loaderIcon) loaderIcon.style.display = "block";
    };

    const updateLoaderText = (text) => {
        const clickShield = document.querySelector(".ut-click-shield");
        if (!clickShield) return;
        let el = clickShield.querySelector(".aisbc-offline-progress");
        if (!el) {
            el = document.createElement("div");
            el.className = "aisbc-offline-progress";
            clickShield.appendChild(el);
        }
        el.textContent = text;
    };

    const hideLoader = () => {
        const clickShield = document.querySelector(".ut-click-shield");
        if (clickShield) {
            clickShield.classList.remove("showing");
            const el = clickShield.querySelector(".aisbc-offline-progress");
            if (el) el.remove();
        }
        const loaderIcon = document.querySelector(".loaderIcon");
        if (loaderIcon) loaderIcon.style.display = "none";
    };

    const createButton = (id, label, callback, buttonClass = "btn-standard") => {
        const button = document.createElement("button");
        button.className = buttonClass;
        button.id = id;
        button.innerHTML = `<span class="button__text">${label}</span>`;
        button.ontouchstart = "";
        button.ontouchend = "";
        const handle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            try { callback(); } catch (err) { /* ignore */ }
        };
        button.addEventListener("click", handle);
        button.addEventListener("touchstart", handle);
        button.addEventListener("mouseenter", () => button.classList.add("hover"));
        button.addEventListener("mouseleave", () => button.classList.remove("hover"));
        return button;
    };

    // ─── 价格缓存（与ai-sbc脚本共享 IndexedDB）/ Price Cache (shared IndexedDB with ai-sbc script) ─
    let cachedPriceItems = null;
    let _loadPriceItemsPromise = null;

    const loadPriceItems = () => {
        if (cachedPriceItems) return Promise.resolve(cachedPriceItems);
        if (_loadPriceItemsPromise) return _loadPriceItemsPromise;
        _loadPriceItemsPromise = new Promise((resolve) => {
            const request = indexedDB.open("futSBCDatabase", 2);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("priceItems")) {
                    db.createObjectStore("priceItems", { keyPath: "id" });
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("priceItems")) {
                    cachedPriceItems = {};
                    _loadPriceItemsPromise = null;
                    resolve({});
                    return;
                }
                const tx = db.transaction(["priceItems"], "readonly");
                const store = tx.objectStore("priceItems");
                const get = store.get("allPriceItems");
                get.onsuccess = (e) => {
                    cachedPriceItems = (e.target.result && e.target.result.data) ? e.target.result.data : {};
                    _loadPriceItemsPromise = null;
                    resolve(cachedPriceItems);
                };
                get.onerror = () => { cachedPriceItems = {}; _loadPriceItemsPromise = null; resolve({}); };
            };
            request.onerror = () => { cachedPriceItems = {}; _loadPriceItemsPromise = null; resolve({}); };
        });
        return _loadPriceItemsPromise;
    };

    const getPrice = (item) => {
        if (!cachedPriceItems) return null;
        return cachedPriceItems[item.definitionId]?.price || null;
    };

    // ─── 价格抓取 / Price Fetching ────────────────────────────────────────────────

    const savePriceItems = () => {
        return new Promise((resolve) => {
            const request = indexedDB.open("futSBCDatabase", 2);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("priceItems")) {
                    db.createObjectStore("priceItems", { keyPath: "id" });
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("priceItems")) { resolve(); return; }
                const tx = db.transaction(["priceItems"], "readwrite");
                const store = tx.objectStore("priceItems");
                store.put({ id: "allPriceItems", data: cachedPriceItems });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            };
            request.onerror = () => resolve();
        });
    };

    const updateCBRMinPrice = () => {
        if (!cachedPriceItems) return;
        const minByRating = new Map();
        for (const key of Object.keys(cachedPriceItems)) {
            if (key.endsWith("_CBR")) continue;
            const entry = cachedPriceItems[key];
            if (!entry || typeof entry.rating !== "number") continue;
            if (!entry.price || entry.isExtinct) continue;
            const currentMin = minByRating.get(entry.rating) ?? Infinity;
            if (entry.price < currentMin) minByRating.set(entry.rating, entry.price);
        }
        for (const [rating, minPrice] of minByRating.entries()) {
            const cbrKey = `${rating}_CBR`;
            const existing = cachedPriceItems[cbrKey] || {};
            cachedPriceItems[cbrKey] = { ...existing, eaId: cbrKey, rating, price: minPrice, timeStamp: new Date(), isExtinct: false };
        }
        savePriceItems();
    };

    const PriceItem = (items) => {
        if (!cachedPriceItems) cachedPriceItems = {};
        const timeStamp = new Date(Date.now());
        for (let key in items) {
            items[key]["timeStamp"] = timeStamp;
            const eaId = items[key]["eaId"];
            cachedPriceItems[eaId] = items[key];
        }
        updateCBRMinPrice();
        savePriceItems();
        return cachedPriceItems;
    };

    const getUserPlatform = () => {
        try {
            if (services.User.getUser().getSelectedPersona().isPC) return "pc";
        } catch (e) { /* ignore */ }
        return "ps";
    };

    const isPriceOld = (item) => {
        if (!cachedPriceItems || !(item?.definitionId in cachedPriceItems)) return true;
        const expiryMin = Number(getOwnSettings().priceExpiry ?? SETTINGS_DEFAULTS.priceExpiry) || 60;
        const FRESH_MS = expiryMin * 60 * 1000;
        const timeStamp = new Date(cachedPriceItems[item.definitionId]?.timeStamp);
        if (!timeStamp.getTime()) return true;
        return (timeStamp.getTime() + FRESH_MS) < Date.now();
    };

    const externalRequest = (method, url) => new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method,
            url,
            onload: (r) => resolve(r.responseText),
            onerror: reject,
        });
    });

    const fetchAndCachePrices = async (players, onProgress, force = false) => {
        const idsArray = [...new Set(players
            .filter((f) => (force || isPriceOld(f)) && f?.isPlayer?.())
            .map((p) => p.definitionId))];
        if (idsArray.length === 0) return;

        const platform = getUserPlatform();
        const BATCH_SIZE = 50;
        const CONCURRENT_REQUESTS = 4;
        const batches = [];
        const tempIds = [...idsArray];
        while (tempIds.length) batches.push(tempIds.splice(0, BATCH_SIZE));

        let done = 0;

        const processBatch = async (batch) => {
            try {
                let priceResponse = {};
                if (platform === "pc") {
                    const params = batch.join("_");
                    const json = JSON.parse(await externalRequest("GET", `https://enhancer-api.futnext.com/players/prices?ids=${params}&platform=pc`));
                    const priceMap = new Map();
                    json.forEach(item => { if (item.prices?.length) priceMap.set(item.definitionId, item.prices[0]); });
                    batch.forEach((definitionId, index) => {
                        const player = players.find(p => p.definitionId === definitionId);
                        if (!player) return;
                        const price = priceMap.get(definitionId);
                        priceResponse[index] = { eaId: definitionId, price: price || null, rating: player.rating || 0, name: player._staticData?.name || "", isExtinct: !price, lastChecked: Date.now() };
                    });
                } else {
                    const params = batch.join("%2C");
                    const proxy = getApiProxy();
                    let json;
                    if (proxy) {
                        try {
                            json = JSON.parse(await externalRequest("GET", `${proxy}?futggapi=player-prices/26/?ids=${params}`));
                        } catch (e) {
                            markProxyDead(proxy);
                            json = null;
                        }
                        if (!json?.data) {
                            markProxyDead(proxy);
                            json = null;
                        }
                    }
                    if (!json) {
                        // 降级到 futnext / Fallback to futnext
                        console.log("[NoBrainSBC] 代理不可用，降级到 futnext / Proxy unavailable, falling back to futnext");
                        const futnextParams = batch.join("_");
                        const futnextJson = JSON.parse(await externalRequest("GET", `https://enhancer-api.futnext.com/players/prices?ids=${futnextParams}&platform=ps`));
                        const priceMap = new Map();
                        futnextJson.forEach(item => { if (item.prices?.length) priceMap.set(item.definitionId, item.prices[0]); });
                        batch.forEach((definitionId, index) => {
                            const player = players.find(p => p.definitionId === definitionId);
                            if (!player) return;
                            const price = priceMap.get(definitionId);
                            priceResponse[index] = { eaId: definitionId, price: price || null, rating: player.rating || 0, name: player._staticData?.name || "", isExtinct: !price, lastChecked: Date.now() };
                        });
                    } else {
                        if (json.data && Array.isArray(json.data)) {
                            const priceMap = new Map();
                            json.data.forEach(item => { if (item.eaId) priceMap.set(item.eaId, item); });
                            batch.forEach((definitionId, index) => {
                                const item = priceMap.get(definitionId);
                                if (item) {
                                    const matchingPlayer = players.find(p => p.definitionId == definitionId);
                                    priceResponse[index] = { ...item, rating: matchingPlayer?.rating || 0, name: matchingPlayer?._staticData?.name || "" };
                                }
                            });
                        }
                    }
                }
                PriceItem(priceResponse);
                done += batch.length;
                if (onProgress) onProgress(`获取价格 ${done}/${idsArray.length}...`);
            } catch (e) { /* skip failed batch */ }
        };

        // 并发执行，滚动窗口保持最多 CONCURRENT_REQUESTS 个同时进行
        const activeRequests = new Set();
        let batchIndex = 0;
        const launchNext = () => {
            while (activeRequests.size < CONCURRENT_REQUESTS && batchIndex < batches.length) {
                const p = processBatch(batches[batchIndex++]).finally(() => {
                    activeRequests.delete(p);
                });
                activeRequests.add(p);
            }
        };
        launchNext();
        while (activeRequests.size > 0) {
            await Promise.race(activeRequests);
            launchNext();
        }
    };

    // ─── 共享设置 / Shared Settings ───────────────────────────────────────────────
    const getSharedSettings = (id) => {
        try {
            const s = JSON.parse(localStorage.getItem("sbcSolverSettings") || "{}");
            return s?.sbcSettings?.[0]?.[0]?.[id] ?? s?.[id];
        } catch (e) { return undefined; }
    };

    // ─── 多选下拉组件 / Multi-select Dropdown ────────────────────────────────────
    const getShellUri = (id, ratingTier) => {
        return AssetLocationUtils.getShellUri(0, 1, id, ratingTier, repositories.Rarity._collection[id]?.guid);
    };
    const createChoice = (parentDiv, label, id, options) => {
        if (document.contains(document.getElementById(id))) {
            document.getElementById(id).remove();
        }
        const row = document.createElement("div");
        row.classList.add("panelActionRow");
        const labelDiv = document.createElement("div");
        labelDiv.classList.add("buttonInfoLabel");
        const choicesLabel = document.createElement("span");
        choicesLabel.classList.add("choicesLabel");
        choicesLabel.innerHTML = label;
        labelDiv.appendChild(choicesLabel);
        row.appendChild(labelDiv);

        const panel = document.createElement("div");
        panel.appendChild(row);
        panel.setAttribute("id", id);

        // Build native multi-select widget
        const wrap = document.createElement("div");
        wrap.className = "ms-wrap";
        const tagsEl = document.createElement("div");
        tagsEl.className = "ms-tags";
        const dd = document.createElement("div");
        dd.className = "ms-dd";
        const searchInput = document.createElement("input");
        searchInput.className = "ms-search";
        searchInput.type = "text";
        searchInput.placeholder = L("ms.search");
        const listEl = document.createElement("div");
        dd.appendChild(searchInput);
        dd.appendChild(listEl);
        wrap.appendChild(tagsEl);
        wrap.appendChild(dd);
        panel.appendChild(wrap);
        parentDiv.appendChild(panel);

        let currentSettings = getSharedSettings(id) || [];
        const selected = new Set(currentSettings.map(String));

        const renderTags = () => {
            tagsEl.innerHTML = "";
            if (selected.size === 0) {
                tagsEl.innerHTML = `<span style="opacity:.5;font-size:13px">${L("ms.placeholder")}</span>`;
                return;
            }
            const rendered = new Set();
            options.forEach((opt) => {
                const v = String(opt.value);
                if (!selected.has(v) || rendered.has(v)) return;
                rendered.add(v);
                const tag = document.createElement("span");
                tag.className = "ms-tag";
                const icon = (opt.customProperties && opt.customProperties.icon) || "";
                tag.innerHTML = icon + " " + opt.label +
                    ' <span class="ms-tag-x" data-val="' + opt.value + '">&times;</span>';
                tagsEl.appendChild(tag);
            });
            tagsEl.querySelectorAll(".ms-tag-x").forEach((x) => {
                const removeTag = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    selected.delete(String(x.dataset.val));
                    persist();
                };
                x.addEventListener("click", removeTag);
                x.addEventListener("touchend", removeTag);
            });
        };

        const renderList = (filter) => {
            listEl.innerHTML = "";
            const q = (filter || "").toLowerCase();
            let count = 0;
            const seen = new Set();
            options.forEach((opt) => {
                const v = String(opt.value);
                if (seen.has(v)) return;
                seen.add(v);
                if (q && !opt.label.toLowerCase().includes(q)) return;
                count++;
                const el = document.createElement("div");
                el.className = "ms-opt" + (selected.has(String(opt.value)) ? " ms-selected" : "");
                const icon = (opt.customProperties && opt.customProperties.icon) || "";
                el.innerHTML = icon + " " + opt.label;
                const selectOpt = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const v = String(opt.value);
                    selected.has(v) ? selected.delete(v) : selected.add(v);
                    persist();
                };
                el.addEventListener("click", selectOpt);
                el.addEventListener("touchend", selectOpt);
                listEl.appendChild(el);
            });
            if (count === 0) {
                listEl.innerHTML = `<div class="ms-empty">${L("ms.empty")}</div>`;
            }
        };

        const persist = () => {
            saveOwnSettings({ [id]: Array.from(selected).map(Number) });
            renderTags();
            renderList(searchInput.value);
        };

        const toggleDd = () => {
            wrap.classList.toggle("ms-open");
            if (wrap.classList.contains("ms-open")) {
                searchInput.value = "";
                renderList("");
                searchInput.focus();
            }
        };
        tagsEl.addEventListener("click", toggleDd);
        tagsEl.addEventListener("touchend", (e) => { e.preventDefault(); toggleDd(); });

        searchInput.addEventListener("input", () => renderList(searchInput.value));
        searchInput.addEventListener("click", (e) => e.stopPropagation());
        searchInput.addEventListener("touchend", (e) => e.stopPropagation());

        const closeDd = (e) => {
            if (!wrap.contains(e.target)) wrap.classList.remove("ms-open");
        };
        document.addEventListener("click", closeDd);
        document.addEventListener("touchend", closeDd);

        renderTags();
    };

    // ─── 内置 API 代理列表 / Built-in API Proxy List ─────────────────────────────
    const BUILTIN_PROXIES = [
        "https://futgg10.pages.dev",
        "https://futgg20.pages.dev",
        "https://futgg30.pages.dev",
        "https://futgg40.pages.dev",
        "https://futgg50.pages.dev",
    ];
    const _deadProxies = new Set();

    const getApiProxy = () => {
        const custom = getOwnSettings().apiProxy?.trim();
        if (custom) return custom;
        const alive = BUILTIN_PROXIES.filter(p => !_deadProxies.has(p));
        if (!alive.length) return null; // 全部不可用，降级到 futnext
        return alive[Math.floor(Math.random() * alive.length)];
    };

    const markProxyDead = (proxy) => {
        if (proxy) _deadProxies.add(proxy);
    };

    // ─── 设置面板 / Settings Panel ────────────────────────────────────────────────
    const SETTINGS_DEFAULTS = {
        excludeSbc: true,
        excludeObjective: true,
        excludeSpecial: false,
        excludeTradable: false,
        excludeExtinct: true,
        showPrices: true,
        duplicateDiscount: 50,
        untradeableDiscount: 80,
        nobrainConceptPremium: 500,
        hillClimbMaxIter: 5000,
        innerRestarts: 6,
        ilsNoImproveLimit: 15,
        maxPriceIncrements: 1,
        priceExpiry: 60,
        apiProxy: "",
    };

    const getOwnSettings = () => {
        try {
            const s = JSON.parse(localStorage.getItem("sbcSolverSettings") || "{}");
            return s?.sbcSettings?.[0]?.[0] || {};
        } catch (e) { return {}; }
    };

    const saveOwnSettings = (obj) => {
        try {
            const s = JSON.parse(localStorage.getItem("sbcSolverSettings") || "{}");
            if (!s.sbcSettings) s.sbcSettings = [[{}]];
            if (!s.sbcSettings[0]) s.sbcSettings[0] = [{}];
            if (!s.sbcSettings[0][0]) s.sbcSettings[0][0] = {};
            Object.assign(s.sbcSettings[0][0], obj);
            localStorage.setItem("sbcSolverSettings", JSON.stringify(s));
        } catch (e) { /* ignore */ }
    };

    const showSettingsPanel = () => {
        const existing = document.getElementById("aisbc-settings-overlay");
        if (existing) { existing.remove(); return; }

        const current = { ...SETTINGS_DEFAULTS, ...getOwnSettings() };

        const overlay = document.createElement("div");
        overlay.id = "aisbc-settings-overlay";
        overlay.className = "aisbc-settings-overlay";

        const EXCLUDE_TOGGLES = [
            ["excludeSbc", L("param.excludeSbc")],
            ["excludeObjective", L("param.excludeObjective")],
            ["excludeSpecial", L("param.excludeSpecial")],
            ["excludeTradable", L("param.excludeTradable")],
            ["excludeExtinct", L("param.excludeExtinct")],
        ];
        const ALGO_NUMBERS = [
            ["duplicateDiscount", L("param.duplicateDiscount"), 0, 100],
            ["untradeableDiscount", L("param.untradeableDiscount"), 0, 100],
            ["nobrainConceptPremium", L("param.conceptPremium"), 100, 1000],
            ["hillClimbMaxIter", L("param.hillClimbMaxIter"), 100, 50000],
            ["innerRestarts", L("param.innerRestarts"), 1, 20],
            ["ilsNoImproveLimit", L("param.ilsNoImproveLimit"), 1, 100],
            ["maxPriceIncrements", L("param.maxPriceIncrements"), 0, 20],
        ];
        const UI_TOGGLES = [
            ["showPrices", L("param.showPrices")],
        ];
        const UI_NUMBERS = [
            ["priceExpiry", L("param.priceExpiry"), 1, 1440],
        ];
        const TEXTS = [
            ["apiProxy", L("param.apiProxy")],
        ];
        const TOGGLES = [...EXCLUDE_TOGGLES, ...UI_TOGGLES];
        const NUMBERS = [...ALGO_NUMBERS, ...UI_NUMBERS];

        const makeToggleRows = (list) => list.map(([key, label]) => `
            <div class="aisbc-settings-row">
                <label>${label}</label>
                <input type="checkbox" id="aisbc-${key}" ${current[key] ? "checked" : ""}>
            </div>`).join("");

        const makeNumberRows = (list) => list.map(([key, label, min = 0, max = 100]) => `
            <div class="aisbc-settings-row">
                <label>${label}</label>
                <input type="number" id="aisbc-${key}" value="${current[key]}" min="${min}" max="${max}">
            </div>`).join("");

        const toggleRows = makeToggleRows(TOGGLES);
        const numberRows = makeNumberRows(NUMBERS);

        const textRows = TEXTS.map(([key, label]) => `
            <div class="aisbc-settings-row">
                <label>${label}</label>
                <input type="text" id="aisbc-${key}" value="${current[key] || ""}" placeholder="${BUILTIN_PROXIES[0]}" style="width:200px;font-size:11px;">
            </div>`).join("");

        overlay.innerHTML = `
            <div class="aisbc-settings-card">
                <h2>${L("settings.title")}</h2>
                <div class="aisbc-tabs">
                    <button class="aisbc-tab active" data-tab="algo">${L("settings.algo")}</button>
                    <button class="aisbc-tab" data-tab="exclude">${L("settings.exclude")}</button>
                    <button class="aisbc-tab" data-tab="players">${L("settings.tabPlayers")}</button>
                    <button class="aisbc-tab" data-tab="ui">${L("settings.ui")}</button>
                </div>
                <div class="aisbc-tab-panel active" data-panel="algo">
                    ${makeNumberRows(ALGO_NUMBERS)}
                </div>
                <div class="aisbc-tab-panel" data-panel="exclude">
                    ${makeToggleRows(EXCLUDE_TOGGLES)}
                </div>
                <div class="aisbc-tab-panel" data-panel="players">
                    <div id="aisbc-exclude-players-anchor"></div>
                    <div style="height:280px;flex-shrink:0;"></div>
                </div>
                <div class="aisbc-tab-panel" data-panel="ui">
                    ${makeNumberRows(UI_NUMBERS)}
                    ${makeToggleRows(UI_TOGGLES)}
                    ${textRows}
                    <div class="aisbc-settings-row">
                        <label></label>
                        <button class="btn-standard mini" id="aisbc-clear-price-cache"><span class="button__text">${L("btn.clearPriceCache")}</span></button>
                    </div>
                </div>
                <div class="aisbc-settings-footer">
                    <button class="btn-standard mini" id="aisbc-settings-reset"><span class="button__text">${L("settings.reset")}</span></button>
                    <button class="btn-standard mini" id="aisbc-settings-save"><span class="button__text">${L("settings.save")}</span></button>
                    <button class="btn-standard mini" id="aisbc-settings-close"><span class="button__text">${L("settings.close")}</span></button>
                </div>
            </div>`;

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.remove();
        });
        overlay.querySelector("#aisbc-settings-close").addEventListener("click", () => overlay.remove());
        overlay.querySelector("#aisbc-settings-save").addEventListener("click", () => {
            const result = {};
            TOGGLES.forEach(([key]) => {
                result[key] = overlay.querySelector(`#aisbc-${key}`).checked;
            });
            NUMBERS.forEach(([key]) => {
                result[key] = Number(overlay.querySelector(`#aisbc-${key}`).value);
            });
            TEXTS.forEach(([key]) => {
                result[key] = overlay.querySelector(`#aisbc-${key}`).value.trim();
            });
            saveOwnSettings(result);
            overlay.remove();
            showNotification(L("settings.saved"), UINotificationType.POSITIVE);
        });

        overlay.querySelector("#aisbc-settings-reset").addEventListener("click", () => {
            const excluded = getOwnSettings().excludePlayerIds;
            saveOwnSettings({ ...SETTINGS_DEFAULTS, excludePlayerIds: excluded });
            overlay.remove();
            showNotification(L("settings.resetDone"), UINotificationType.POSITIVE);
        });

        overlay.querySelector("#aisbc-clear-price-cache").addEventListener("click", (e) => {
            cachedPriceItems = null;
            _loadPriceItemsPromise = null;
            const req = indexedDB.open("futSBCDatabase", 2);
            req.onupgradeneeded = ev => {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains("priceItems")) {
                    db.createObjectStore("priceItems", { keyPath: "id" });
                }
            };
            req.onsuccess = ev => {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains("priceItems")) return;
                const tx = db.transaction(["priceItems"], "readwrite");
                tx.objectStore("priceItems").delete("allPriceItems");
            };
            const btn = e.currentTarget.querySelector(".button__text");
            btn.textContent = L("btn.clearPriceCacheDone");
            setTimeout(() => { btn.textContent = L("btn.clearPriceCache"); }, 1500);
        });

        document.body.appendChild(overlay);

        // Tab 切换逻辑 / Tab switching logic
        let playersLoaded = false;
        const loadPlayersTab = () => {
            if (playersLoaded) return;
            playersLoaded = true;
            const anchor = overlay.querySelector("#aisbc-exclude-players-anchor");
            anchor.textContent = L("misc.loading");
            fetchPlayers().then(players => {
                if (!document.contains(overlay)) return;
                anchor.textContent = "";
                createChoice(anchor, L("param.excludePlayers"), "excludePlayers",
                    players.map(item => ({
                        label: (item._staticData.firstName + " " + item._staticData.lastName).trim() || item._staticData.lastName,
                        value: item.definitionId,
                        id: item.definitionId,
                        customProperties: { icon: `<img width="24" src='${getShellUri(item.rareflag, item.rareflag < 4 ? item.getTier() : ItemRatingTier.NONE)}'/>` },
                    }))
                );
            });
        };
        overlay.querySelectorAll(".aisbc-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                overlay.querySelectorAll(".aisbc-tab").forEach(t => t.classList.remove("active"));
                overlay.querySelectorAll(".aisbc-tab-panel").forEach(p => p.classList.remove("active"));
                tab.classList.add("active");
                const panel = overlay.querySelector(`.aisbc-tab-panel[data-panel="${tab.dataset.tab}"]`);
                if (panel) panel.classList.add("active");
                if (tab.dataset.tab === "players") loadPlayersTab();
            });
        });
    };

    // ─── 固定/锁定球员 / Fixed / Locked Items ────────────────────────────────────
    const FIXED_ITEMS_KEY = "fixeditems";

    const getFixedItems = () => {
        try { return JSON.parse(localStorage.getItem(FIXED_ITEMS_KEY)) || []; }
        catch (e) { return []; }
    };

    const getLockedItems = () => {
        try { return getSharedSettings("excludePlayers") || []; }
        catch (e) { return []; }
    };

    const saveLockedItems = () => {
        saveOwnSettings({ excludePlayers: getLockedItems() });
    };
    const lockItem = (item) => {
        const lockedItems = getLockedItems();
        lockedItems.push(item.definitionId);
        saveOwnSettings({ excludePlayers: lockedItems });
    };
    const unlockItem = (item) => {
        const lockedItems = getLockedItems();
        const index = lockedItems.indexOf(item.definitionId);
        if (index > -1) lockedItems.splice(index, 1);
        saveOwnSettings({ excludePlayers: lockedItems });
    };

    const isItemFixed = (item) => getFixedItems().includes(item.id);
    const isItemLocked = (item) => getLockedItems().includes(item.definitionId);

    // ─── 球员获取 / Player Fetching ───────────────────────────────────────────────
    const searchClub = ({ count, level, rarities, offset, sort }) => {
        const searchCriteria = new UTBucketedItemSearchViewModel().searchCriteria;
        if (count) searchCriteria.count = count;
        if (level) searchCriteria.level = level;
        if (sort) searchCriteria._sort = sort;
        if (rarities) searchCriteria.rarities = rarities;
        if (offset) searchCriteria.offset = offset;
        return services.Club.search(searchCriteria);
    };

    const fetchPlayers = ({ count = Infinity, level, rarities, sort } = {}) => {
        return new Promise((resolve) => {
            services.Club.clubDao.resetStatsCache();
            services.Club.getStats();
            let offset = 0;
            const batchSize = DEFAULT_SEARCH_BATCH_SIZE;
            let result = [];
            const inner = () => {
                searchClub({ count: batchSize, level, rarities, offset, sort })
                    .observe(undefined, async (sender, response) => {
                        result = [...result, ...response.response.items];
                        if (result.length < count && Math.floor(response.status / 100) === 2 && !response.response.retrievedAll) {
                            offset += batchSize;
                            inner();
                            return;
                        }
                        if (count !== Infinity) result = result.slice(0, count);
                        resolve(result);
                    });
            };
            inner();
        });
    };

    const getStoragePlayers = () => {
        return new Promise((resolve) => {
            const gathered = [];
            const searchCriteria = new UTBucketedItemSearchViewModel().searchCriteria;
            searchCriteria.offset = 0;
            searchCriteria.count = DEFAULT_SEARCH_BATCH_SIZE;
            const getAll = () => {
                services.Item.searchStorageItems(searchCriteria).observe(this, (sender, response) => {
                    gathered.push(...response.response.items);
                    if (response.status !== 400 && !response.response.endOfList) {
                        searchCriteria.offset += searchCriteria.count;
                        getAll();
                    } else {
                        resolve(gathered);
                    }
                });
            };
            getAll();
        });
    };

    // ─── 球队评分公式 / Squad Rating Formula ─────────────────────────────────────
    const calcSquadRating = (ratings) => {
        const total = ratings.reduce((a, b) => a + b, 0);
        const avg = total / 11;
        const excess = ratings.reduce((a, r) => a + (r > avg ? r - avg : 0), 0);
        return Math.min(Math.max(Math.floor((total + excess + 0.5) / 11), 0), 99);
    };

    // ─── 化学值计算 / Chemistry Calculation ──────────────────────────────────────
    const teamId_bucket   = [[0,1],[2,3],[4,6],[7,11]];
    const leagueId_bucket = [[0,2],[3,4],[5,7],[8,11]];
    const nationId_bucket = [[0,1],[2,4],[5,7],[8,11]];

    const bucketScore = (count, bucket) => {
        for (let i = bucket.length - 1; i >= 0; i--) {
            if (count >= bucket[i][0]) return i;
        }
        return 0;
    };

    const calcChemistry = (squad, formation) => {
        const teamCounts   = {};
        const leagueCounts = {};
        const nationCounts = {};

        for (let i = 0; i < squad.length; i++) {
            const p = squad[i];
            if (!p) continue;
            const slotPos = formation ? formation[i] : null;
            const inPosition = !formation || slotPos == null || slotPos === -1 || (p.possiblePositions && p.possiblePositions.includes(slotPos));
            if (!inPosition) continue;

            const isIcon = p.normalizeClubId === 0 && p.maxChem === 3;
            const isHero = p.maxChem === 3 && !isIcon;

            if (!isIcon) {
                teamCounts[p.teamId] = (teamCounts[p.teamId] || 0) + 1;
            }
            leagueCounts[p.leagueId] = (leagueCounts[p.leagueId] || 0) + (isHero ? 2 : 1);
            nationCounts[p.nationId] = (nationCounts[p.nationId] || 0) + (isIcon ? 2 : 1);
        }

        const playerChems = squad.map((p, i) => {
            if (!p) return 0;
            const slotPos = formation ? formation[i] : null;
            const inPosition = !formation || slotPos == null || slotPos === -1 || (p.possiblePositions && p.possiblePositions.includes(slotPos));
            if (!inPosition) return 0;

            const isIcon = p.normalizeClubId === 0 && p.maxChem === 3;
            if (isIcon) return 3;
            const tc = bucketScore(teamCounts[p.teamId] || 0, teamId_bucket);
            const lc = bucketScore(leagueCounts[p.leagueId] || 0, leagueId_bucket);
            const nc = bucketScore(nationCounts[p.nationId] || 0, nationId_bucket);
            return Math.min(tc + lc + nc, 3);
        });

        const totalChem = playerChems.reduce((a, b) => a + b, 0);
        return { totalChem, playerChems };
    };

    // ─── 约束检查 / Constraint Checking ──────────────────────────────────────────
    const checkConstraints = (squad, formation, constraints) => {
        const players = squad.filter(Boolean);
        // 所有非brick位置必须填满（formation[i] !== -1 表示真实位置）/ Must have all non-brick slots filled (formation[i] !== -1 means it's a real slot)
        const requiredSlots = formation.filter(f => f !== -1).length;
        if (players.length < requiredSlots) return false;

        const ratings = players.map(p => p.rating);
        const squadRating = calcSquadRating(ratings);
        const { totalChem, playerChems } = calcChemistry(squad, formation);

        for (const req of constraints) {
            const key = req.requirementKey;
            const scope = req.scope;
            const count = req.count;
            const vals = req.eligibilityValues;

            const satisfies = (actual, target, sc) => {
                if (sc === "GREATER") return actual >= target;
                if (sc === "LOWER")   return actual <= target;
                if (sc === "EXACT")   return actual === target;
                return true;
            };

            if (key === "TEAM_RATING") {
                if (!satisfies(squadRating, vals[0], scope)) return false;
            }
            else if (key === "CHEMISTRY_POINTS") {
                if (!satisfies(totalChem, vals[0], scope)) return false;
            }
            else if (key === "ALL_PLAYERS_CHEMISTRY_POINTS") {
                if (playerChems.some(c => !satisfies(c, vals[0], scope))) return false;
            }
            else if (key === "PLAYER_MIN_OVR") {
                const cnt = players.filter(p => p.rating >= vals[0]).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "PLAYER_MAX_OVR") {
                const cnt = players.filter(p => p.rating <= vals[0]).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "PLAYER_EXACT_OVR") {
                const cnt = players.filter(p => p.rating >= vals[0]).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "PLAYER_QUALITY") {
                const cnt = players.filter(p => satisfies(p.ratingTier, vals[0], scope)).length;
                if (cnt < count) return false;
            }
            else if (key === "PLAYER_LEVEL") {
                const cnt = players.filter(p => vals.some(v => Array.isArray(v) ? v.includes(p.ratingTier) : v === p.ratingTier)).length;
                if (cnt < count) return false;
            }
            else if (key === "PLAYER_RARITY") {
                const cnt = players.filter(p => vals.includes(p.rarityId)).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "PLAYER_RARITY_GROUP") {
                const cnt = players.filter(p => p.groups && p.groups.some(g => vals.includes(g))).length;
                if (scope === "EXACT" && cnt !== count) return false;
                if (scope === "GREATER" && cnt < count) return false;
                if (scope === "LOWER" && cnt > count) return false;
            }
            else if (key === "SAME_CLUB_COUNT") {
                const clubCounts = {};
                players.forEach(p => { clubCounts[p.teamId] = (clubCounts[p.teamId] || 0) + 1; });
                const maxSame = Math.max(...Object.values(clubCounts));
                if (!satisfies(maxSame, vals[0], scope)) return false;
            }
            else if (key === "SAME_LEAGUE_COUNT") {
                const leagueCounts2 = {};
                players.forEach(p => { leagueCounts2[p.leagueId] = (leagueCounts2[p.leagueId] || 0) + 1; });
                const maxSame = Math.max(...Object.values(leagueCounts2));
                if (!satisfies(maxSame, vals[0], scope)) return false;
            }
            else if (key === "SAME_NATION_COUNT") {
                const nationCounts2 = {};
                players.forEach(p => { nationCounts2[p.nationId] = (nationCounts2[p.nationId] || 0) + 1; });
                const maxSame = Math.max(...Object.values(nationCounts2));
                if (!satisfies(maxSame, vals[0], scope)) return false;
            }
            else if (key === "CLUB_COUNT") {
                const uniqueClubs = new Set(players.map(p => p.teamId)).size;
                if (!satisfies(uniqueClubs, vals[0], scope)) return false;
            }
            else if (key === "LEAGUE_COUNT") {
                const uniqueLeagues = new Set(players.map(p => p.leagueId)).size;
                if (!satisfies(uniqueLeagues, vals[0], scope)) return false;
            }
            else if (key === "NATION_COUNT") {
                const uniqueNations = new Set(players.map(p => p.nationId)).size;
                if (!satisfies(uniqueNations, vals[0], scope)) return false;
            }
            else if (key === "CLUB_ID") {
                const cnt = players.filter(p => vals.includes(p.teamId)).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "LEAGUE_ID") {
                const cnt = players.filter(p => vals.includes(p.leagueId)).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
            else if (key === "NATION_ID") {
                const cnt = players.filter(p => vals.includes(p.nationId)).length;
                if (!satisfies(cnt, count, scope)) return false;
            }
        }
        return true;
    };

    // ─── 费用计算 / Cost Calculation ─────────────────────────────────────────────
    const squadCost = (squad) => {
        return squad.reduce((total, p) => {
            if (!p || p.isFixed) return total;
            return total + (p.price || 15000000);
        }, 0);
    };

    // ─── 按全队约束预过滤球员池 / Pre-filter player pool by "all 11" constraints ──
    const preFilterPlayers = (players, constraints, totalSlots) => {
        let pool = players;
        for (const req of constraints) {
            const vals = req.eligibilityValues;
            if (req.requirementKey === "PLAYER_QUALITY" && req.count == -1) {
                if (req.scope === "GREATER" || req.scope === "EXACT")
                    pool = pool.filter(p => p.ratingTier >= vals[0]);
                if (req.scope === "LOWER" || req.scope === "EXACT")
                    pool = pool.filter(p => p.ratingTier <= vals[0]);
                continue;
            }
            if (req.count !== totalSlots) continue;
            if (req.requirementKey === "LEAGUE_ID") {
                pool = pool.filter(p => vals.includes(p.leagueId));
            } else if (req.requirementKey === "NATION_ID") {
                pool = pool.filter(p => vals.includes(p.nationId));
            } else if (req.requirementKey === "CLUB_ID") {
                pool = pool.filter(p => vals.includes(p.teamId));
            } else if (req.requirementKey === "PLAYER_QUALITY") {
                if (req.scope === "GREATER" || req.scope === "EXACT")
                    pool = pool.filter(p => p.ratingTier >= vals[0]);
                if (req.scope === "LOWER" || req.scope === "EXACT")
                    pool = pool.filter(p => p.ratingTier <= vals[0]);
            } else if (req.requirementKey === "PLAYER_RARITY") {
                pool = pool.filter(p => vals.includes(p.rarityId));
            } else if (req.requirementKey === "PLAYER_RARITY_GROUP") {
                pool = pool.filter(p => p.groups && p.groups.some(g => vals.includes(g)));
            }
        }
        return pool;
    };

    // ─── 贪心初始解 / Greedy Initial Solution ────────────────────────────────────
    const greedySolve = (players, sbcData) => {
        const { formation, brickIndices, constraints } = sbcData;
        const squad = new Array(11).fill(null);

        // 先放置固定球员 / Place bricks first
        for (const idx of brickIndices) {
            const brickId = sbcData.currentSolution[idx];
            if (brickId) {
                const p = players.find(pl => pl.id === brickId);
                if (p) squad[idx] = p;
            }
        }

        // 按全队约束预过滤球员池 / Pre-filter pool by "all 11" constraints
        const totalSlots = formation.filter(f => f !== -1).length;
        const filteredPlayers = preFilterPlayers(players, constraints, totalSlots);

        // 按价格升序排列 / Sort by price ascending
        const available = filteredPlayers
            .filter(p => !p.isFixed || brickIndices.some(bi => sbcData.currentSolution[bi] === p.id))
            .filter(p => !isItemLocked(p))
            .sort((a, b) => (a.price || 15000000) - (b.price || 15000000));

        const usedDbIds = new Set(squad.filter(Boolean).map(p => p.databaseId));

        const chemReq = constraints.find(r => r.requirementKey === "CHEMISTRY_POINTS");
        const strictPos = chemReq ? chemReq.eligibilityValues[0] > 0 : false;

        for (let slot = 0; slot < 11; slot++) {
            if (squad[slot]) continue;
            if (brickIndices.includes(slot)) continue;
            const slotPos = formation[slot];
            if (slotPos === -1) continue;

            const candidates = available.filter(p =>
                !usedDbIds.has(p.databaseId) &&
                (!strictPos || p.possiblePositions.includes(slotPos))
            );
            if (candidates.length === 0) continue;
            squad[slot] = candidates[0];
            usedDbIds.add(candidates[0].databaseId);
        }

        return squad;
    };

    // ─── 引导搜索趋向可行解的启发式评分 / Heuristic score for guiding search toward feasibility ─
    const feasibilityScore = (squad, formation, constraints) => {
        const players = squad.filter(Boolean);
        if (players.length === 0) return -Infinity;
        const ratings = players.map(p => p.rating);
        const squadRating = players.length === 11 ? calcSquadRating(ratings) : 0;
        const { totalChem } = players.length === 11 ? calcChemistry(squad, formation) : { totalChem: 0 };

        const progress = (actual, target, scope) => {
            if (scope === "GREATER") return actual >= target ? 1.0 : actual / target;
            if (scope === "LOWER")   return actual <= target ? 1.0 : target / actual;
            // EXACT
            return actual === target ? 1.0 : 1 - Math.abs(actual - target) / target;
        };

        let score = 0;
        for (const req of constraints) {
            const vals = req.eligibilityValues;
            const key = req.requirementKey;
            const scope = req.scope;
            let actual, target;

            if (key === "TEAM_RATING") {
                actual = squadRating; target = vals[0];
            } else if (key === "CHEMISTRY_POINTS") {
                actual = totalChem; target = vals[0];
            } else if (key === "PLAYER_LEVEL") {
                actual = players.filter(p => vals.includes(p.ratingTier)).length; target = req.count;
            } else if (key === "PLAYER_QUALITY" && req.count > 0) {
                actual = players.filter(p => {
                    if (scope === "GREATER" || scope === "EXACT") return p.ratingTier >= vals[0];
                    if (scope === "LOWER") return p.ratingTier <= vals[0];
                    return false;
                }).length; target = req.count;
            } else if (key === "SAME_NATION_COUNT") {
                const nc = {}; players.forEach(p => { nc[p.nationId] = (nc[p.nationId]||0)+1; });
                actual = Object.values(nc).length ? Math.max(...Object.values(nc)) : 0; target = vals[0];
            } else if (key === "SAME_LEAGUE_COUNT") {
                const lc = {}; players.forEach(p => { lc[p.leagueId] = (lc[p.leagueId]||0)+1; });
                actual = Object.values(lc).length ? Math.max(...Object.values(lc)) : 0; target = vals[0];
            } else if (key === "SAME_CLUB_COUNT") {
                const cc = {}; players.forEach(p => { cc[p.teamId] = (cc[p.teamId]||0)+1; });
                actual = Object.values(cc).length ? Math.max(...Object.values(cc)) : 0; target = vals[0];
            } else if (key === "LEAGUE_COUNT") {
                actual = new Set(players.map(p => p.leagueId)).size; target = vals[0];
            } else if (key === "CLUB_COUNT") {
                actual = new Set(players.map(p => p.teamId)).size; target = vals[0];
            } else if (key === "NATION_COUNT") {
                actual = new Set(players.map(p => p.nationId)).size; target = vals[0];
            } else if (key === "PLAYER_RARITY_GROUP") {
                actual = players.filter(p => p.groups && p.groups.some(g => vals.includes(g))).length; target = req.count;
            } else if (key === "PLAYER_RARITY") {
                actual = players.filter(p => vals.includes(p.rarityId)).length; target = req.count;
            } else if (key === "PLAYER_MIN_OVR") {
                actual = players.filter(p => p.rating >= vals[0]).length; target = req.count;
            } else if (key === "PLAYER_MAX_OVR") {
                actual = players.filter(p => p.rating <= vals[0]).length; target = req.count;
            } else {
                continue;
            }

            score += target > 0 ? progress(actual, target, scope) : 1.0;
        }
        return score;
    };

    // ─── 爬山局部搜索 / Hill Climbing Local Search ────────────────────────────────
    let _localSearchCount = 0;
    const localSearch = async (initialSquad, players, sbcData, maxIter = HILL_CLIMB_MAX_ITER, onProgress = null, numRestarts = 6) => {
        const _lsId = ++_localSearchCount;
        const { formation, brickIndices, constraints } = sbcData;
        let bestCost = checkConstraints(initialSquad, formation, constraints) ? squadCost(initialSquad) : Infinity;
        let bestSquad = [...initialSquad];

        const chemReq = constraints.find(r => r.requirementKey === "CHEMISTRY_POINTS");
        const chemTarget = chemReq ? chemReq.eligibilityValues[0] : 0;
        let strictPosition = chemTarget > 0;

        const meetsChemTarget = (squad) => {
            if (!strictPosition) return true;
            const { totalChem } = calcChemistry(squad, formation);
            return totalChem >= chemTarget;
        };

        const totalSlots = formation.filter(f => f !== -1).length;
        const filteredPlayers = preFilterPlayers(players, constraints, totalSlots);
        const available = filteredPlayers
            .filter(p => !isItemLocked(p))
            .sort((a, b) => (a.price || 15000000) - (b.price || 15000000));

        // 阶段1：多次内部重启，每次从initialSquad重新开始。
        // 每次ILS扰动带来真正不同的探索，
        // 为阶段2提供不同起点以跳出局部最优。
        // Phase 1: multiple inner restarts, each starting fresh from initialSquad.
        // Each ILS perturbation leads to genuinely different explorations,
        // giving Phase 2 different starting points to escape local optima.
        const INNER_RESTARTS = numRestarts;
        const itersPerRestart = Math.floor(maxIter / INNER_RESTARTS);
        const freeSlots1 = [];
        for (let i = 0; i < 11; i++) {
            if (!brickIndices.includes(i) && formation[i] !== -1) freeSlots1.push(i);
        }
        for (let restart = 0; restart < INNER_RESTARTS; restart++) {
            let localSquad;
            if (restart === 0) {
                localSquad = [...initialSquad];
            } else {
                const shuffled = [...available].sort(() => Math.random() - 0.5);
                localSquad = new Array(11).fill(null);
                const brickUsedDbIds = new Set();
                for (const idx of brickIndices) {
                    if (initialSquad[idx]) { localSquad[idx] = initialSquad[idx]; brickUsedDbIds.add(initialSquad[idx].databaseId); }
                }
                const usedDbIds = new Set(brickUsedDbIds);
                for (let slot = 0; slot < 11; slot++) {
                    if (brickIndices.includes(slot) || formation[slot] === -1) continue;
                    const slotPos = formation[slot];
                    // 位置池为空时回退到任意球员 / Try position-matched first, fall back to any player if pool is too small
                    const p = shuffled.find(p => !usedDbIds.has(p.databaseId) && (!strictPosition || p.possiblePositions.includes(slotPos)))
                           || shuffled.find(p => !usedDbIds.has(p.databaseId));
                    if (p) { localSquad[slot] = p; usedDbIds.add(p.databaseId); }
                }
            }
            let localScore = feasibilityScore(localSquad, formation, constraints);

            for (let iter = 0; iter < itersPerRestart; iter++) {
                if (freeSlots1.length === 0) break;
                const emptySlots = freeSlots1.filter(i => !localSquad[i]);
                const targetSlots = emptySlots.length > 0 ? emptySlots : freeSlots1;
                const slot = targetSlots[Math.floor(Math.random() * targetSlots.length)];
                const slotPos = formation[slot];
                const usedDbIds = new Set(localSquad.filter((p, i) => p && i !== slot).map(p => p.databaseId));

                const candidates = available.filter(p =>
                    !usedDbIds.has(p.databaseId) &&
                    (!strictPosition || p.possiblePositions.includes(slotPos))
                );
                // 位置不匹配时回退到任意球员 / Fall back to any available player if position-strict pool is empty
                const finalCandidates = candidates.length > 0 ? candidates : available.filter(p => !usedDbIds.has(p.databaseId));
                if (finalCandidates.length === 0) continue;

                const candidate = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
                const newSquad = [...localSquad];
                newSquad[slot] = candidate;

                if (checkConstraints(newSquad, formation, constraints)) {
                    const newCost = squadCost(newSquad);
                    if (newCost < bestCost) {
                        bestCost = newCost;
                        bestSquad = [...newSquad];
                    }
                    if (strictPosition && meetsChemTarget(newSquad)) strictPosition = false;
                    localSquad = [...newSquad];
                    localScore = Infinity;
                } else {
                    const newScore = feasibilityScore(newSquad, formation, constraints);
                    const accepted = newScore > localScore || emptySlots.length > 0;
                    if (accepted) {
                        localSquad = [...newSquad];
                        localScore = newScore;
                    }
                }
                if (onProgress && iter % 1000 === 0) {
                    onProgress(`restart ${restart + 1}/${INNER_RESTARTS}, iter ${iter}/${itersPerRestart}`);
                    await new Promise(r => setTimeout(r, 0));
                }
            }
        }

        if (bestCost === Infinity) return { squad: bestSquad, cost: bestCost, feasible: false, lsId: _lsId };

        // 阶段2：系统性贪心降费——每轮随机打乱位置顺序 / Phase 2: systematic greedy cost minimization - shuffle slot order each pass
        const freeSlotOrder = [];
        for (let i = 0; i < 11; i++) {
            if (!brickIndices.includes(i) && formation[i] !== -1) freeSlotOrder.push(i);
        }
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = freeSlotOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [freeSlotOrder[i], freeSlotOrder[j]] = [freeSlotOrder[j], freeSlotOrder[i]];
            }
            for (const slot of freeSlotOrder) {
                const slotPos = formation[slot];
                const currentPrice = bestSquad[slot]?.price || 15000000;
                const usedDbIds = new Set(bestSquad.filter((p, i) => p && i !== slot).map(p => p.databaseId));

                const prev = bestSquad[slot];
                for (const candidate of available) {
                    if ((candidate.price || 15000000) >= currentPrice) {
                        break;
                    }
                    if (usedDbIds.has(candidate.databaseId)) {
                        continue;
                    }
                    bestSquad[slot] = candidate;
                    const ok = checkConstraints(bestSquad, formation, constraints);
                    if (ok) {
                        bestCost = squadCost(bestSquad);
                        improved = true;
                        break;
                    }
                    bestSquad[slot] = prev;
                }
            }
        }

        return { squad: bestSquad, cost: bestCost, feasible: true, lsId: _lsId };
    };

    // ─── 价格显示 / Price Display ─────────────────────────────────────────────────
    const appendPricesToSquad = (squadSlots) => {
        if (!cachedPriceItems || !squadSlots?.length) return;
        squadSlots.forEach(({ rootElement, item }) => {
            if (!item || !item.definitionId) return;
            const old = rootElement.querySelector(".aisbc-price-label");
            if (old) old.remove();
            const entry = cachedPriceItems[item.definitionId];
            if (!entry || !entry.price) return;
            const label = document.createElement("div");
            label.className = "aisbc-price-label";
            const p = entry.price;
            label.textContent = p.toLocaleString();
            if (!entry.isExtinct && !entry.isObjective && isFodder(item)) {
                label.style.background = "#00a651";
                label.style.color = "#fff";
                label.style.border = "1px solid #4cdb85";
            }
            // 珍贵球员：价格 >= 2倍CBR且 >= 2倍最低限价，红色背景警示 / Precious: price >= 2x CBR and >= 2x min price limit, show red warning
            if (isPrecious(item)) {
                label.classList.add("precious");
            }
            rootElement.prepend(label);
        });
    };

    // ─── 初始化（等待 services 就绪）/ Initialization (wait for services) ─────────
    const init = () => {
        if (!services?.Localization) {
            setTimeout(init, 2000);
            return;
        }

        // 预加载价格缓存 / Pre-load price cache
        loadPriceItems();
    };

    init();

    // Hook 登录视图，UI 就绪后做语言检测并弹通知 / Detect lang and notify after UI is ready
    const _origLoginGenerate = UTLoginView.prototype._generate;
    UTLoginView.prototype._generate = function (...args) {
        const result = _origLoginGenerate.call(this, ...args);
        if (!this._langNotified) {
            this._langNotified = true;
            try {
                const lang = services.Localization.locale.language;
                if (!lang.startsWith("zh")) aisbcLang = 1;
            } catch (e) {
                // default to Chinese
            }
        }
        return result;
    };

    const _origSetSlots = UTSquadPitchView.prototype.setSlots;
    UTSquadPitchView.prototype.setSlots = function (...args) {
        const result = _origSetSlots.call(this, ...args);
        const showPrices = getSharedSettings("showPrices") ?? SETTINGS_DEFAULTS.showPrices;
        if (showPrices) {
            const slots = this.getSlotViews();
            const squadSlots = [];
            slots.forEach((slot, index) => {
                const item = args[0]?.[index];
                if (item) squadSlots.push({ item: item._item, rootElement: slot.getRootElement() });
            });
            loadPriceItems().then(async () => {
                const players = squadSlots.map(s => s.item).filter(item => item && item.definitionId);
                if (players.length) await fetchAndCachePrices(players, null, true);
                appendPricesToSquad(squadSlots);
            });
        }
        return result;
    };

    // ─── 保存阵容 / Save Squad ────────────────────────────────────────────────────
    const saveSquad = async (_challenge, _squad, solutionPlayers) => {
        _squad.removeAllItems();
        _squad.setPlayers(solutionPlayers, true);
        await services.SBC.saveChallenge(_challenge).observe(this, async (z, d) => {
            if (!d.success) {
                hideLoader();
                showNotification(L("notify.saveFailed"), UINotificationType.NEGATIVE);
                return;
            }
            services.SBC.loadChallengeData(_challenge).observe(this, async (z2, data) => {
                try {
                    const squad = data.response.squad;
                    hideLoader();
                    const ps = squad._players.map(p => p._item);
                    _challenge.squad.setPlayers(ps, true);
                    _challenge.onDataChange.notify({ squad });
                    showNotification(L("notify.solved"), UINotificationType.POSITIVE);
                    // 保存完成后返回阵容界面（与FSU行为一致）/ Navigate back after save completes, same as FSU
                    if (isPhone() && cntlr.current()?.className === "UTSBCSquadDetailPanelViewController") {
                        setTimeout(() => {
                            cntlr.current().parentViewController._eBackButtonTapped();
                        }, 500);
                    }
                } catch (e) {
                    hideLoader();
                }
            });
        });
    };

    // ─── 求解主函数 / Main Solver ─────────────────────────────────────────────────
    const nobrainSolveSBC = async (_challenge) => {
        showLoader();
        const solveStart = Date.now();
        const updateProgress = (text) => {
            const elapsed = ((Date.now() - solveStart) / 1000).toFixed(1);
            updateLoaderText(`${text} (${elapsed}s)`);
        };
        showNotification(L("notify.solving"), UINotificationType.POSITIVE);

        try {
            // 从挑战赛构建sbcData / Build sbcData from challenge
            const challengeRequirements = _challenge.eligibilityRequirements.map(eligibility => {
                const keys = Object.keys(eligibility.kvPairs._collection);
                return {
                    scope: SBCEligibilityScope[eligibility.scope],
                    count: eligibility.count,
                    requirementKey: SBCEligibilityKey[keys[0]],
                    eligibilityValues: eligibility.kvPairs._collection[keys[0]],
                };
            });

            const sbcData = {
                constraints: challengeRequirements,
                formation: _challenge.squad._formation.generalPositions.map((m, i) =>
                    _challenge.squad.simpleBrickIndices.includes(i) ? -1 : m
                ),
                brickIndices: _challenge.squad.simpleBrickIndices,
                currentSolution: _challenge.squad._players.map(m => m._item._metaData?.id).slice(0, 11),
            };

            // 获取俱乐部球员 + 仓库（未分配）球员 / Fetch club players + storage (unassigned) players
            const [clubPlayers, storagePlayers] = await Promise.all([fetchPlayers(), getStoragePlayers()]);
            // 标记仓库球员以便应用折扣 / Mark storage players so price discount can be applied
            storagePlayers.forEach(p => { p.isStorage = true; });
            // 合并：仓库版本替换俱乐部同definitionId球员（仓库享受折扣）/ Merge: storage replaces club version of same definitionId (storage gets discount)
            const storageDefIds = new Set(storagePlayers.map(p => p.definitionId));
            const rawPlayers = [
                ...clubPlayers.filter(p => !storageDefIds.has(p.definitionId)),
                ...storagePlayers,
            ];

            // 收集当前上场阵容球员ID以排除 / Collect active squad player IDs to exclude
            const activeSquadPlayerIds = new Set();
            try {
                repositories.Squad.squads
                    .get(services.User.getUser().selectedPersona)
                    .get(services.Squad.activeSquad)
                    .getPlayers()
                    .forEach(p => { if (p.item?.id > 0) activeSquadPlayerIds.add(p.item.id); });
            } catch (e) {}

            // 异步加载价格缓存 / Load price cache async
            await loadPriceItems();
            // 抓取缺失或过期的球员价格 / Fetch missing or stale player prices
            updateProgress("获取球员价格...");
            await fetchAndCachePrices(rawPlayers, updateProgress);
            // 补全缺失的CBR条目（ai-sbc脚本未覆盖45以下评分）/ Fill missing CBR entries (ratings < 45 not covered by ai-sbc script)
            for (let i = 1; i <= 81; i++) {
                if (!cachedPriceItems[i + "_CBR"] || !cachedPriceItems[i + "_CBR"].price) {
                    cachedPriceItems[i + "_CBR"] = { price: i < 75 ? 200 : 400 };
                }
            }

            // 初始化化学值工具（normalizeClubId和maxChem）/ Setup chem util for normalizeClubId and maxChem
            const chemUtil = new UTSquadChemCalculatorUtils();
            chemUtil.chemService = services.Chemistry;
            chemUtil.teamConfigRepo = repositories.TeamConfig;
            rawPlayers.forEach(item => {
                item.profile = chemUtil.getChemProfileForPlayer(item);
                item.normalizeClubId = chemUtil.normalizeClubId(item.teamId);
                if (!item.groups || !item.groups.length) item.groups = [0];
            });

            // 读取共享设置 / Read shared settings
            const excludeSbc        = getOwnSettings().excludeSbc        ?? SETTINGS_DEFAULTS.excludeSbc;
            const excludeObjective  = getOwnSettings().excludeObjective  ?? SETTINGS_DEFAULTS.excludeObjective;
            const excludeSpecial    = getOwnSettings().excludeSpecial    ?? SETTINGS_DEFAULTS.excludeSpecial;
            const excludeTradable   = getOwnSettings().excludeTradable   ?? SETTINGS_DEFAULTS.excludeTradable;
            const excludeExtinct    = getOwnSettings().excludeExtinct    ?? SETTINGS_DEFAULTS.excludeExtinct;
            const excludeLockedPlayers = getLockedItems();
            const duplicateDiscount   = getSharedSettings("duplicateDiscount")   ?? 50;
            const untradeableDiscount = getSharedSettings("untradeableDiscount") ?? 80;
            const conceptPremium      = getSharedSettings("nobrainConceptPremium") ?? 500;
            const hillClimbMaxIter    = getSharedSettings("hillClimbMaxIter")    ?? 5000;
            const innerRestarts       = getSharedSettings("innerRestarts")       ?? 6;
            const ilsNoImproveLimitBase = getSharedSettings("ilsNoImproveLimit") ?? 15;

            // 映射为求解器格式，过滤租借/限时/设置排除的球员 / Map to solver format, filtering loans/timelimited/settings
            const players = rawPlayers
                .filter(item => item.isPlayer && item.isPlayer())
                .filter(item => item.loans < 0)
                .filter(item => !item.isTimeLimited())
                .filter(item => !activeSquadPlayerIds.has(item.id))
                .filter(item => !(item.isSpecial && item.isSpecial() && excludeSpecial && item.rareflag !== 3))
                .filter(item => !(item.isTradeable && item.isTradeable() && excludeTradable))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isSbc && excludeSbc))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isObjective && excludeObjective))
                .filter(item => !excludeLockedPlayers.includes(item.definitionId))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isExtinct && excludeExtinct))
                .filter(item => getPrice(item) != null) // 无价格球员不参与求解 / Exclude players with no price
                .map(item => {
                    const rawPrice = getPrice(item);
                    const cbrPrice = cachedPriceItems[item.rating + "_CBR"]?.price || 100;
                    let price = rawPrice != null ? Math.max(rawPrice, cbrPrice, 100) : cbrPrice;
                    price = price - (100 - item.rating);
                    if (item.duplicateId > 0 || item.isStorage) {
                        price = price * duplicateDiscount / 100;
                    }
                    if (item.isTradeable && !item.isTradeable()) {
                        price = price * untradeableDiscount / 100;
                    }
                    price = Math.max(Math.round(price), 100);
                    return {
                        id: item.id,
                        definitionId: item.definitionId,
                        databaseId: item.databaseId || item.definitionId,
                        name: item._staticData?.name || item.definitionId,
                        rating: item.rating,
                        teamId: item.teamId,
                        leagueId: item.leagueId,
                        nationId: item.nationId,
                        rarityId: item.rareflag,
                        ratingTier: item.getTier ? item.getTier() : 0,
                        possiblePositions: item.possiblePositions || [],
                        groups: item.groups || [],
                        isFixed: isItemFixed(item),
                        isStorage: item.isStorage || false,
                        concept: item.concept || false,
                        price,
                        maxChem: item.profile?.maxChem || 0,
                        normalizeClubId: item.normalizeClubId,
                    };
                })
                .filter(p => !p.concept);

            if (players.length === 0) {
                hideLoader();
                showNotification(L("notify.noPlayers"), UINotificationType.NEGATIVE);
                return;
            }

            // 迭代评分窗口：从紧窗口[target-1, target+1]开始，每次各扩展1直到找到可行解 / Iterative rating window: start tight [target-1, target+1], expand by 1 each side until solution found
            const ratingReq = sbcData.constraints.find(r => r.requirementKey === "TEAM_RATING" && r.scope === "GREATER");
            const ratingTarget = ratingReq ? ratingReq.eligibilityValues[0] : 0;
            const maxFloorDrop = ratingTarget >= 84 ? 5 : (ratingTarget > 0 ? 99 : 0);

            // 无条件注入当前阵容中的虚拟球员到可用库（价格 × conceptPremium%），使求解器能用真实球员替换
            // Unconditionally inject concept players from current squad into pool (price × conceptPremium%) so solver can replace them with real players
            {
                const conceptsInSquad = _challenge.squad._players.slice(0, 11)
                    .map(m => m._item)
                    .filter(item => item?.concept);
                if (conceptsInSquad.length > 0) {
                    const existingDefIds = new Set(players.map(p => p.definitionId));
                    conceptsInSquad.forEach(item => {
                        if (existingDefIds.has(item.definitionId)) return;
                        item.profile = chemUtil.getChemProfileForPlayer(item);
                        item.normalizeClubId = chemUtil.normalizeClubId(item.teamId);
                        const rawPrice = cachedPriceItems[item.definitionId]?.price || 0;
                        const cbrPrice = cachedPriceItems[item.rating + "_CBR"]?.price || 100;
                        let price = Math.max(rawPrice, cbrPrice, 100);
                        price = Math.max(Math.round(price * conceptPremium / 100), 100);
                        players.push({
                            id: item.id,
                            definitionId: item.definitionId,
                            databaseId: item.databaseId || item.definitionId,
                            name: item._staticData?.name || String(item.definitionId),
                            rating: item.rating,
                            teamId: item.teamId,
                            leagueId: item.leagueId,
                            nationId: item.nationId,
                            rarityId: item.rareflag,
                            ratingTier: item.getTier ? item.getTier() : 0,
                            possiblePositions: item.possiblePositions || [],
                            groups: item.groups || [],
                            isFixed: false,
                            isStorage: false,
                            concept: true,
                            price,
                            maxChem: item.profile?.maxChem || 0,
                            normalizeClubId: item.normalizeClubId,
                        });
                        existingDefIds.add(item.definitionId);
                    });
                }
            }


            let bestResult = { feasible: false, cost: Infinity };
            let bestCappedPlayers = players;

            // 检查当前阵容是否已满足约束 / Check if current squad already satisfies constraints
            const playerById = new Map(players.map(p => [p.id, p]));
            const currentSquad = _challenge.squad._players.slice(0, 11).map(m => playerById.get(m._item?.id) || null);
            if (checkConstraints(currentSquad, sbcData.formation, sbcData.constraints)) {
                bestResult = { feasible: true, cost: squadCost(currentSquad), squad: currentSquad, lsId: 0 };
                bestCappedPlayers = ratingTarget > 0
                    ? players.filter(p => p.rating >= ratingTarget - maxFloorDrop)
                    : players;
            }

            // 寻找能产生可行解的最小评分窗口 / Find the minimum window that yields a feasible solution
            const maxPlayerRating = ratingTarget > 0 ? Math.max(...players.map(p => p.rating)) : 99;
            if (!bestResult.feasible) for (let expand = 0; expand <= 99; expand++) {
                const cap = ratingTarget > 0 ? ratingTarget + 1 + expand : 99;
                if (ratingTarget > 0 && expand > 0 && cap > maxPlayerRating) break;
                const floorDrop = ratingTarget > 0 ? Math.min(expand, maxFloorDrop) : 0;
                const ratingFloor = ratingTarget > 0 ? ratingTarget - 1 - floorDrop : 0;
                const cappedPlayers = ratingTarget > 0 ? players.filter(p => p.rating <= cap && p.rating >= ratingFloor) : players;
                const squad = greedySolve(cappedPlayers, sbcData);
                const filled = squad.filter(Boolean);
                const { totalChem } = calcChemistry(squad);
                const uniqueLeagues = new Set(filled.map(p => p.leagueId)).size;
                const uniqueClubs = new Set(filled.map(p => p.teamId)).size;
                const maxNation = Math.max(...Object.values(filled.reduce((a, p) => { a[p.nationId] = (a[p.nationId]||0)+1; return a; }, {})));
                const goldCount = filled.filter(p => p.ratingTier === 3).length;
                const tiers = filled.reduce((a, p) => { a[p.ratingTier] = (a[p.ratingTier]||0)+1; return a; }, {});
                const pq = sbcData.constraints.find(r => r.requirementKey === "PLAYER_QUALITY");
                const poolTiers = cappedPlayers.reduce((a, p) => { a[p.ratingTier] = (a[p.ratingTier]||0)+1; return a; }, {});
                const lsProgressCb = t => {
                    const m = t.match(/restart (\d+)\/(\d+), iter (\d+)\/(\d+)/);
                    if (m) {
                        const pct = (((parseInt(m[1])-1)*parseInt(m[4]) + parseInt(m[3])) / (parseInt(m[2])*parseInt(m[4])) * 100).toFixed(1);
                        updateProgress(L("progress.pct", pct));
                    } else {
                        updateProgress(t);
                    }
                };
                const result = await localSearch(squad, cappedPlayers, sbcData, hillClimbMaxIter, lsProgressCb, innerRestarts);
                if (result.feasible) {
                    if (result.cost < bestResult.cost) { bestCappedPlayers = cappedPlayers; bestResult = result; }
                    // 再尝试一次扩展以用更大球员池找到更便宜的解 / Try one more expansion to find cheaper solution with wider player pool
                    const cap2 = ratingTarget > 0 ? cap + 1 : 99;
                    const floorDrop2 = ratingTarget > 0 ? Math.min(expand + 1, maxFloorDrop) : 0;
                    const ratingFloor2 = ratingTarget > 0 ? ratingTarget - 1 - floorDrop2 : 0;
                    const cappedPlayers2 = ratingTarget > 0 ? players.filter(p => p.rating <= cap2 && p.rating >= ratingFloor2) : players;
                    const squad2 = greedySolve(cappedPlayers2, sbcData);
                    const result2 = await localSearch(squad2, cappedPlayers2, sbcData, hillClimbMaxIter, lsProgressCb, innerRestarts);
                    if (result2.feasible && result2.cost < bestResult.cost) { bestCappedPlayers = cappedPlayers2; bestResult = result2; }
                    // 找到可行解后，扩展球员池到完整范围，让低分球员参与降费优化
                    // After finding feasible solution, expand pool to full range so cheap low-rated players can reduce cost
                    if (bestResult.feasible && ratingTarget > 0) {
                        // 找到可行解后去掉评分限制，ILS阶段用全部球员降费
                        // After feasible solution found, remove rating window for ILS cost optimization
                        bestCappedPlayers = players;
                    }
                    const logSquad = (label, r) => {
                        const { totalChem } = calcChemistry(r.squad, sbcData.formation);
                    };
                    logSquad('best after expand', bestResult);
                    break;
                }
            }

            if (!bestResult.feasible) {
                hideLoader();
                showNotification("求解失败：未找到可行解", UINotificationType.NEGATIVE);
                return;
            }

            // 迭代局部搜索：连续N轮无改善则停止；有虚拟球员时加倍以确保高价虚拟球员被替换
            // Iterated Local Search: stop after N rounds with no improvement; double limit when concept players present to ensure expensive ones get replaced
            const hasConceptInPool = players.some(p => p.concept);
            const ILS_NO_IMPROVE_LIMIT = hasConceptInPool ? ilsNoImproveLimitBase * 2 : ilsNoImproveLimitBase;
            let ilsNoImprove = 0;
            let ilsIter = 0;
            const { formation: f0, brickIndices: bi0 } = sbcData;
            const freeSlots = [];
            for (let i = 0; i < 11; i++) {
                if (!bi0.includes(i) && f0[i] !== -1) freeSlots.push(i);
            }
            while (ilsNoImprove < ILS_NO_IMPROVE_LIMIT) {
                ilsIter++;
                const perturbed = [...bestResult.squad];
                const toPerturb = [...freeSlots].sort(() => Math.random() - 0.5).slice(0, 3);
                const ilsBase = ilsNoImprove * hillClimbMaxIter;
                const ilsTotal = ILS_NO_IMPROVE_LIMIT * hillClimbMaxIter;
                for (const slot of toPerturb) perturbed[slot] = null;
                const result = await localSearch(perturbed, bestCappedPlayers, sbcData, hillClimbMaxIter, t => {
                    const match = t.match(/iter (\d+)/);
                    if (match) {
                        const pct = ((ilsBase + parseInt(match[1])) / ilsTotal * 100).toFixed(1);
                        updateLoaderText(`优化进度：${pct}%`);
                    }
                });
                if (result.feasible && result.cost < bestResult.cost) {
                    bestResult = result;
                    const { totalChem } = calcChemistry(bestResult.squad, sbcData.formation);
                    ilsNoImprove = 0;
                } else {
                    ilsNoImprove++;
                }
            }

            // 评分降级：用最低评分的有效替补替换最高评分球员 / Rating downgrade pass: replace highest-rated player with lowest-rated valid substitute
            if (ratingTarget > 0) {
                const { formation, brickIndices, constraints } = sbcData;
                const downgradPool = bestCappedPlayers
                    .filter(p => !isItemLocked(p))
                    .sort((a, b) => a.rating - b.rating || (a.price || 15000000) - (b.price || 15000000));
                let current = [...bestResult.squad];
                let improved = true;
                const skippedSlots = new Set();
                while (improved) {
                    improved = false;
                    let worstSlot = -1, worstRating = -1;
                    for (let i = 0; i < 11; i++) {
                        if (brickIndices.includes(i) || formation[i] === -1) continue;
                        if (skippedSlots.has(i)) continue;
                        if (current[i] && current[i].rating > worstRating) {
                            worstRating = current[i].rating;
                            worstSlot = i;
                        }
                    }
                    if (worstSlot === -1) break;
                    const slotPos = formation[worstSlot];
                    const usedDbIds = new Set(current.filter((p, i) => p && i !== worstSlot).map(p => p.databaseId));
                    let replaced = false;
                    const currentSlotPrice = current[worstSlot]?.price || 15000000;
                    for (const candidate of downgradPool) {
                        if (candidate.rating >= worstRating) break;
                        if (usedDbIds.has(candidate.databaseId)) continue;
                        if ((candidate.price || 15000000) >= currentSlotPrice) continue;
                        const newSquad = [...current];
                        newSquad[worstSlot] = candidate;
                        if (checkConstraints(newSquad, formation, constraints)) {
                            current = newSquad;
                            improved = true;
                            replaced = true;
                            skippedSlots.clear();
                            break;
                        }
                    }
                    if (!replaced) {
                        skippedSlots.add(worstSlot);
                        improved = true;
                    }
                }
                bestResult = { ...bestResult, squad: current };
            }

            // 构建saveSquad所需的球员列表 / Build solution player list for saveSquad
            const _squad = cntlr.current()?._squad || cntlr.current()?._challenge?.squad;
            if (!_squad) {
                hideLoader();
                showNotification(L("notify.noSquad"), UINotificationType.NEGATIVE);
                return;
            }

            const solutionPlayers = new Array(11).fill(null);

            bestResult.squad.forEach((p, idx) => {
                if (!p) return;
                const match = rawPlayers.find(cp => cp.id === p.id);
                if (match) {
                    solutionPlayers[idx] = match;
                } else {
                    // 尝试从当前阵容取原始 item（注入的 concept 球员）/ Try to reuse original item from current squad (injected concept player)
                    const squadItem = _challenge.squad._players
                        .map(m => m._item)
                        .find(item => item?.id === p.id);
                    if (squadItem) {
                        solutionPlayers[idx] = squadItem;
                    } else {
                        const conceptPlayer = new UTItemEntity();
                        conceptPlayer.definitionId = p.definitionId;
                        conceptPlayer.stackCount = 1;
                        conceptPlayer.id = p.definitionId;
                        conceptPlayer.concept = true;
                        solutionPlayers[idx] = conceptPlayer;
                    }
                }
            });

            await saveSquad(_challenge, _squad, solutionPlayers);

        } catch (e) {
            hideLoader();
            showNotification(L("notify.error", e.message), UINotificationType.NEGATIVE);
        }
    };

    // ─── 按钮注入 / Button Injection ─────────────────────────────────────────────
    const squadDetailPanelViewInit = UTSBCSquadDetailPanelView.prototype.init;
    UTSBCSquadDetailPanelView.prototype.init = function (...args) {
        const response = squadDetailPanelViewInit.call(this, ...args);

        const offlineBtn = createButton("idOfflineSolveSbc", L("btn.solve"), async () => {
            const { _challenge } = cntlr.current();
            if (!_challenge) {
                showNotification(L("notify.noChallenge"), UINotificationType.NEGATIVE);
                return;
            }
            await nobrainSolveSBC(_challenge);
        });

        offlineBtn.style.flex = "1";
        offlineBtn.classList.add("mini");

        // 虚拟求解按钮（仅 FSU 存在时显示）/ Concept solve button (only shown when FSU is present)
        let conceptSolveBtn = null;
        if (isFSURunning()) {
            conceptSolveBtn = createButton("idConceptSolveSbc", L("btn.conceptSolve"), async () => {
                const controller = cntlr.current();
                const _challenge = controller?._challenge;
                if (!_challenge) {
                    showNotification(L("notify.noChallenge"), UINotificationType.NEGATIVE);
                    return;
                }
                const fillBtn = getFsuFillBtn();
                if (!fillBtn) {
                    showNotification(L("notify.fsuNotFound"), UINotificationType.NEGATIVE);
                    return;
                }
                // 每次登录首次调用时显示致谢提示 / Show credit notice once per session
                if (!sessionStorage.getItem("nobrainFsuCreditShown")) {
                    sessionStorage.setItem("nobrainFsuCreditShown", "1");
                    showNotification(L("notify.fsuCredit"), UINotificationType.POSITIVE);
                    await new Promise(r => setTimeout(r, 2500));
                }
                // Hook events.saveSquad 拦截 FSU 填充完成，阻止其保存
                // Hook events.saveSquad to intercept FSU fill completion and suppress its save
                let filled = false;
                const origSaveSquad = unsafeWindow.events.saveSquad;
                const nav = cntlr.current()?.getNavigationController?.();
                const origBack = nav?._eBackButtonTapped?.bind(nav);
                const restoreBack = () => { if (nav && origBack) nav._eBackButtonTapped = origBack; };
                try {
                    if (nav) nav._eBackButtonTapped = () => {};
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error("timeout")), 30000);
                        // 轮询 FSU 的 info.run.template，取消时提前退出（延迟500ms启动，等getTemplate设置标志）
                        // Poll FSU's info.run.template to detect cancellation; delay start to let getTemplate set the flag
                        let pollStarted = false;
                        const cancelPoll = setInterval(() => {
                            if (!pollStarted) { pollStarted = true; return; }
                            if (!unsafeWindow.info?.run?.template) {
                                clearInterval(cancelPoll);
                                clearTimeout(timeout);
                                reject(new Error("cancelled"));
                            }
                        }, 500);
                        unsafeWindow.events.saveSquad = async (c, s, l, a) => {
                            clearInterval(cancelPoll);
                            clearTimeout(timeout);
                            s.removeAllItems();
                            s.setPlayers(l, true);
                            filled = true;
                            resolve();
                        };
                        unsafeWindow.events.getTemplate(fillBtn, 1);
                    });
                } catch (e) {
                    if (e.message === "timeout") showNotification(L("notify.fsuFillTimeout"), UINotificationType.NEGATIVE);
                    // cancelled: 静默退出 / cancelled: silent exit
                } finally {
                    unsafeWindow.events.saveSquad = origSaveSquad;
                    // _eBackButtonTapped 在 nobrainSolveSBC 完成后恢复，不在此处恢复
                    // _eBackButtonTapped restored after solver completes, not here
                }
                if (filled) {
                    try {
                        // 等 FSU 的 finally（hideLoader）执行完再开始求解
                        // Wait for FSU's finally (hideLoader) to run before starting solver
                        await new Promise(r => setTimeout(r, 100));
                        await nobrainSolveSBC(_challenge);
                    } finally {
                        restoreBack();
                    }
                } else {
                    restoreBack();
                }
            });
            conceptSolveBtn.style.flex = "1";
            conceptSolveBtn.classList.add("mini");
        }

        // 设置齿轮按钮 / Settings gear button
        const settingsBtn = createButton("idOfflineSbcSettings", "⚙", () => {
            showSettingsPanel();
        }, "btn-standard");
        if (settingsBtn) {
            settingsBtn.classList.add("mini");
            settingsBtn.style.flexShrink = "0";
            settingsBtn.style.width = "36px";
            settingsBtn.style.padding = "0";
        }

        // 批量购买按钮 / Batch buy button
        const buyBtn = createButton("idNobrainBuySquad", L("btn.buySquad"), async () => {
            if (buyBtn.dataset.running === "true") return;
            buyBtn.dataset.running = "true";
            buyBtn.setAttribute("disabled", "disabled");
            buyBtn.classList.add("disabled");

            const { container: statusContainer, content: statusContent, footer: statusFooter } = getOrCreateBuyStatusPanel();
            statusContainer.style.display = "flex";
            statusContent.innerHTML = "";
            statusFooter.textContent = "";

            const titleBlock = document.createElement("div");
            titleBlock.textContent = L("buy.title");
            titleBlock.className = "nobrain-buy-title";
            statusContent.appendChild(titleBlock);
            const hintBlock = document.createElement("div");
            hintBlock.textContent = L("buy.closeToStop");
            hintBlock.style.cssText = "font-size:0.75rem;opacity:0.6;margin-bottom:0.35rem;text-align:center;";
            statusContent.appendChild(hintBlock);

            const conceptItems = getConceptsInSquad();
            if (!conceptItems.length) {
                showNotification(L("notify.noConcepts"), UINotificationType.NEGATIVE);
                delete buyBtn.dataset.running;
                buyBtn.removeAttribute("disabled");
                buyBtn.classList.remove("disabled");
                return;
            }

            _buyAborted = false;
            let successCount = 0;
            try {
                const headerRow = document.createElement("div");
                headerRow.className = "nobrain-buy-header-row";
                [L("buy.colPlayer"), L("buy.colExpected"), L("buy.colStatus")].forEach((lbl) => {
                    const span = document.createElement("span");
                    span.textContent = lbl;
                    headerRow.appendChild(span);
                });
                statusContent.appendChild(headerRow);

                const rowData = conceptItems.map((conceptItem) => {
                    const name = (conceptItem?._staticData?.firstName + " " + conceptItem?._staticData?.lastName).trim() || conceptItem?._staticData?.lastName || String(conceptItem?.definitionId || "");
                    const rawExpectedPrice = getPrice(conceptItem);
                    const expectedPrice = typeof rawExpectedPrice === "number" && Number.isFinite(rawExpectedPrice) && rawExpectedPrice > 0 ? rawExpectedPrice : NaN;
                    const expectedLabel = Number.isFinite(expectedPrice) ? expectedPrice.toLocaleString() : L("misc.na");
                    const row = document.createElement("div");
                    row.className = "nobrain-buy-row";
                    const nameSpan = document.createElement("span"); nameSpan.textContent = name;
                    const priceSpan = document.createElement("span"); priceSpan.textContent = expectedLabel;
                    const statusSpan = document.createElement("span"); statusSpan.textContent = L("buy.queued");
                    row.append(nameSpan, priceSpan, statusSpan);
                    statusContent.appendChild(row);
                    return { conceptItem, expectedLabel, statusSpan };
                });

                statusContent.scrollTop = statusContent.scrollHeight;

                for (let i = 0; i < rowData.length; i++) {
                    if (_buyAborted) break;
                    const { conceptItem, expectedLabel, statusSpan } = rowData[i];
                    statusSpan.textContent = L("buy.buying");
                    statusSpan.style.color = "";

                    const result = await buyConceptPlayer(conceptItem, { suppressNotifications: true });

                    if (result?.success) {
                        successCount += 1;
                        const label = result?.priceLabel || expectedLabel;
                        statusSpan.textContent = label ? L("buy.successAt", label) : L("buy.success");
                        statusSpan.style.color = "#07f468";
                    } else {
                        let reasonLabel = L("buy.failed");
                        if (result?.reason === "alreadyOwned") {
                            reasonLabel = L("buy.alreadyOwned");
                            statusSpan.style.color = "#aaa";
                        } else if (result?.reason === "noCachedPrice") {
                            reasonLabel = L("buy.missingPrice");
                        } else if (result?.reason === "noListing") {
                            reasonLabel = L("buy.noListing");
                        } else if (result?.reason === "priceAboveBaseline") {
                            const baselineLabel = result?.baselineLabel || (Number.isFinite(result?.baseline) ? result.baseline.toLocaleString() : "unknown");
                            const priceLabel = result?.priceLabel || expectedLabel;
                            reasonLabel = priceLabel && baselineLabel ? L("buy.skipped", priceLabel, baselineLabel) : L("buy.priceTooHigh");
                        } else if (result?.reason === "bidFailed") {
                            reasonLabel = L("buy.bidRejected");
                        } else if (result?.reason === "error") {
                            reasonLabel = L("buy.error");
                        }
                        if (result?.reason !== "alreadyOwned") statusSpan.style.color = "#f40727";
                        statusSpan.textContent = reasonLabel;
                    }

                    if (i < rowData.length - 1 && !_buyAborted) {
                        const delay = 2000 + Math.floor(Math.random() * 3000);
                        const end = Date.now() + delay;
                        while (Date.now() < end && !_buyAborted) {
                            statusFooter.textContent = `${L("buy.nextIn")} ${((end - Date.now()) / 1000).toFixed(1)}s`;
                            await new Promise((r) => setTimeout(r, Math.min(200, end - Date.now())));
                        }
                        statusFooter.textContent = "";
                    } else {
                        statusFooter.textContent = "";
                    }
                }

                showNotification(
                    L("notify.buyComplete", successCount, conceptItems.length),
                    successCount === conceptItems.length ? UINotificationType.POSITIVE : UINotificationType.NEGATIVE
                );
            } catch (err) {
                console.error("[NoBrainSBC] Buy squad error", err);
                showNotification(L("notify.buyEncounterError"), UINotificationType.NEGATIVE);
            } finally {
                if (!_buyAborted) {
                    statusFooter.textContent = L("buy.closingIn");
                    await new Promise((r) => setTimeout(r, 5000));
                }
                _buyAborted = false;
                statusContainer.style.display = "none";
                statusContent.innerHTML = "";
                statusFooter.textContent = "";
                delete buyBtn.dataset.running;
                buyBtn.removeAttribute("disabled");
                buyBtn.classList.remove("disabled");
            }
        });
        buyBtn.style.flex = "1";
        buyBtn.classList.add("mini");

        // 找到现有按钮容器并追加 / Find the existing button container and append
        const existingBtn = document.getElementById("idSolveSbcNC");
        if (existingBtn && existingBtn.parentNode) {
            existingBtn.parentNode.appendChild(offlineBtn);
            if (conceptSolveBtn) existingBtn.parentNode.appendChild(conceptSolveBtn);
            existingBtn.parentNode.appendChild(buyBtn);
            if (settingsBtn) existingBtn.parentNode.appendChild(settingsBtn);
        } else {
            // 回退：插入到兑换按钮前 / Fallback: insert before exchange button
            try {
                const container = document.createElement("div");
                container.style.display = "flex";
                container.style.gap = "0.5rem";
                container.style.width = "95%";
                container.style.padding = "0 0.5rem";
                offlineBtn.style.flex = "1";
                container.appendChild(offlineBtn);
                if (conceptSolveBtn) container.appendChild(conceptSolveBtn);
                container.appendChild(buyBtn);
                if (settingsBtn) container.appendChild(settingsBtn);
                this._btnExchange.__root.parentNode.insertBefore(container, this._btnExchange.__root);
            } catch (e) {
                /* ignore injection error */
            }
        }

        return response;
    };

    // ─── 球员列表价格显示 / Player List Price Display ────────────────────────────
    const isFodder = (item) => {
        if (!cachedPriceItems) return false;
        if (item.rating > 90) return false;
        if (cachedPriceItems[item.definitionId]?.isExtinct || cachedPriceItems[item.definitionId]?.isObjective) return false;
        const price = cachedPriceItems[item.definitionId]?.price;
        if (!price) return false;
        const cbrPrice = cachedPriceItems[item.rating + "_CBR"]?.price || 0;
        let fodderPrice = cbrPrice;
        if (item.rareflag === 1) {
            // 稀有球员按评分段设定最低 fodder 基准 / Rare cards: rating-based floor
            const rareFloor = item.rating >= 88 ? 900 : item.rating >= 82 ? 700 : item.rating >= 75 ? 650 : 0;
            fodderPrice = Math.max(cbrPrice, rareFloor);
        }
        return fodderPrice > 0 && price <= fodderPrice * 1.1;
    };

    const isPrecious = (item) => {
        if (!cachedPriceItems) return false;
        if (item.rareflag !== 0 && item.rareflag !== 1) return false;
        const price = cachedPriceItems[item.definitionId]?.price;
        if (!price) return false;
        const cbrPrice = cachedPriceItems[item.rating + "_CBR"]?.price || 0;
        let basePrice = cbrPrice;
        if (item.rareflag === 1) {
            // 稀有球员按评分段设定基准，与 isFodder 一致 / Rare cards: same rating-based floor as isFodder
            const rareFloor = item.rating >= 88 ? 900 : item.rating >= 82 ? 700 : item.rating >= 75 ? 650 : 0;
            basePrice = Math.max(cbrPrice, rareFloor);
        }
        return basePrice > 0 && price >= basePrice * 2;
    };

    const getPriceDiv = (item) => {
        if (!getSharedSettings("showPrices") || !item.definitionId) return null;
        if (!cachedPriceItems) {
            return null;
        }
        const entry = cachedPriceItems[item.definitionId];
        if (!entry || !entry.price) return null;
        const price = entry.price;
        const el = document.createElement("div");
        el.className = "aisbc-price-label";
        if (isFodder(item)) { el.style.background = "#00a651"; el.style.color = "#fff"; el.style.border = "1px solid #4cdb85"; }
        if (isPrecious(item)) {
            el.classList.add("precious");
        }
        el.textContent = entry.isExtinct ? L("price.extinct") : entry.isObjective ? "" : price.toLocaleString();
        return el;
    };

    const UTPlayerItemView_renderItem = UTPlayerItemView.prototype.renderItem;
    UTPlayerItemView.prototype.renderItem = function (item, t) {
        const result = UTPlayerItemView_renderItem.call(this, item, t);
        const root = this.__root;
        if (!root) return result;
        if (cachedPriceItems) {
            const el = getPriceDiv(item);
            if (el) { root.querySelector(".aisbc-price-label")?.remove(); root.prepend(el); }
            root.classList.toggle("locked", isItemLocked(item));
        } else {
            setTimeout(async () => {
                await loadPriceItems();
                const el = getPriceDiv(item);
                if (el) { root.querySelector(".aisbc-price-label")?.remove(); root.prepend(el); }
                root.classList.toggle("locked", isItemLocked(item));
            }, 0);
        }
        return result;
    };

    // ─── 列表渲染时自动取价 / Auto-fetch prices on list render ────────────────────
    let _autoFetchTimer = null;
    const _autoFetchPlayers = (listView) => {
        const players = (listView.listRows || [])
            .map(row => row.data)
            .filter(item => item?.isPlayer?.() && isPriceOld(item));
        if (players.length === 0) return;
        clearTimeout(_autoFetchTimer);
        _autoFetchTimer = setTimeout(async () => {
            await loadPriceItems();
            await fetchAndCachePrices(players);
            // 取价完成后，找球员卡片 DOM 刷新价格标签
            // After fetch, find player card DOM elements and refresh price labels
            (listView.listRows || []).forEach(row => {
                const item = row.data;
                if (!item?.isPlayer?.()) return;
                const cardView = row.itemComponent || row;
                const root = cardView.__root;
                if (!root) return;
                root.querySelector(".aisbc-price-label")?.remove();
                const el = getPriceDiv(item);
                if (el) root.prepend(el);
            });
        }, 300);
    };

    const _origRenderItems = UTPaginatedItemListView.prototype.renderItems;
    UTPaginatedItemListView.prototype.renderItems = function (t) {
        const result = _origRenderItems.call(this, t);
        _autoFetchPlayers(this);
        return result;
    };

    const _origRenderSection = UTUnassignedItemsView.prototype.renderSection;
    let _pendingSectionPlayers = [];
    UTUnassignedItemsView.prototype.renderSection = function (items, t, i) {
        const result = _origRenderSection.call(this, items, t, i);
        const players = (items || []).filter(item => item?.isPlayer?.() && isPriceOld(item));
        if (players.length === 0) return result;
        _pendingSectionPlayers.push(...players);
        const viewRef = this;
        clearTimeout(_autoFetchTimer);
        _autoFetchTimer = setTimeout(async () => {
            const toFetch = _pendingSectionPlayers.splice(0);
            await loadPriceItems();
            await fetchAndCachePrices(toFetch);
            (viewRef.sections || []).forEach(section => {
                (section?.listRows || []).forEach(row => {
                    if (!row.data?.isPlayer?.()) return;
                    const cardView = row.itemComponent || row._view
                        || (row.childViews || []).find(v => v instanceof UTPlayerItemView);
                    const root = cardView?.__root;
                    if (!root) return;
                    root.querySelector(".aisbc-price-label")?.remove();
                    const el = getPriceDiv(row.data);
                    if (el) root.prepend(el);
                });
            });
        }, 300);
        return result;
    };

    const _origSetCarouselItems = UTPlayerPicksView.prototype.setCarouselItems;
    UTPlayerPicksView.prototype.setCarouselItems = function (e) {
        const result = _origSetCarouselItems.call(this, e);
        const players = (e || []).filter(item => item?.isPlayer?.());
        if (players.length === 0) return result;
        const viewRef = this;
        setTimeout(async () => {
            await loadPriceItems();
            const toFetch = players.filter(isPriceOld);
            if (toFetch.length > 0) await fetchAndCachePrices(toFetch);
            const containers = Array.from(
                viewRef._carouselItemsContainer?.__carouselItemsContainer?.children || []
            );
            (e || []).forEach((item, idx) => {
                if (!item?.isPlayer?.()) return;
                const container = containers[idx];
                if (!container) return;
                const cardRoot = container.querySelector(".ut-item") || container;
                cardRoot.querySelector(".aisbc-price-label")?.remove();
                const el = getPriceDiv(item);
                if (el) cardRoot.prepend(el);
            });
        }, 500);
        return result;
    };

    // ─── 球员卡片 Lock/Unlock 按钮注入 / Player Card Lock/Unlock Button Injection ─
    let lockedLabel = () => L("btn.sbcUnlock");
    let unlockedLabel = () => L("btn.sbcLock");

    const insertAfter = (newNode, existingNode) => {
        const getRoot = el => el.getRootElement ? el.getRootElement() : el;
        const ref = getRoot(existingNode);
        ref.parentNode.insertBefore(getRoot(newNode), ref.nextSibling);
    };

    const UTDefaultSetItem = UTSlotActionPanelView.prototype.setItem;
    UTSlotActionPanelView.prototype.setItem = function (e, t) {
        const result = UTDefaultSetItem.call(this, e, t);
        if (e.loans > -1 || !e.isPlayer() || !e.id || e.isTimeLimited()) return result;
        if (!e?.duplicateId > 0 && !isItemFixed(e) && !this.lockUnlockButton) {
            const label = isItemLocked(e) ? lockedLabel() : unlockedLabel();
            const button = new UTGroupButtonControl();
            button.init();
            insertAfter(button, this._btnDiscard);
            button.setInteractionState(true);
            button.setText(label);
            button.addTarget(this, async () => {
                if (isItemLocked(e)) {
                    unlockItem(e);
                    button.setText(unlockedLabel());
                    showNotification(L("notify.unlocked"), UINotificationType.POSITIVE);
                } else {
                    lockItem(e);
                    button.setText(lockedLabel());
                    showNotification(L("notify.locked"), UINotificationType.POSITIVE);
                }
                getControllerInstance().applyDataChange();
                cntlr.right()?.renderView();
            }, EventType.TAP);
            this.lockUnlockButton = button;
        }
        return result;
    };

    const UTDefaultAction = UTDefaultActionPanelView.prototype.render;
    UTDefaultActionPanelView.prototype.render = function (e, t, i, o, n, r, s) {
        const result = UTDefaultAction.call(this, e, t, i, o, n, r, s);
        if (e.loans > -1 || !e.isPlayer() || !e.id || e.isTimeLimited()) return result;
        if (!e?.duplicateId > 0 && !isItemFixed(e) && !this.lockUnlockButton) {
            const label = isItemLocked(e) ? lockedLabel() : unlockedLabel();
            const button = new UTGroupButtonControl();
            button.init();
            insertAfter(button, this._discardButton);
            button.setInteractionState(true);
            button.setText(label);
            button.addTarget(this, async () => {
                if (isItemLocked(e)) {
                    unlockItem(e);
                    button.setText(unlockedLabel());
                    showNotification(L("notify.unlocked"), UINotificationType.POSITIVE);
                } else {
                    lockItem(e);
                    button.setText(lockedLabel());
                    showNotification(L("notify.locked"), UINotificationType.POSITIVE);
                }
                try {
                    cntlr.left()?.renderView();
                    cntlr.right()?.renderView();
                } catch (err) {
                    cntlr.left()?.refreshList();
                }
            }, EventType.TAP);
            this.lockUnlockButton = button;
        }
        return result;
    };

    // ─── 批量购买虚拟球员 / Batch Buy Concept Players ────────────────────────────

    const fetchUnassigned = () => {
        repositories.Item.unassigned.clear();
        repositories.Item.unassigned.reset();
        return new Promise((resolve) => {
            services.Item.requestUnassignedItems().observe(undefined, (_s, response) => {
                resolve([...response.response.items]);
            });
        });
    };

    const moveUnassignedToClub = async () => {
        try {
            const ulist = await fetchUnassigned();
            const toTeam = ulist.filter((item) => item.isMovable());
            if (toTeam.length > 0) {
                console.log(`[NoBrainSBC] 移动未分配球员到俱乐部 / Moving unassigned to club: count=${toTeam.length}`);
                services.Item.move(toTeam, 7);
            }
        } catch (err) {
            console.error("[NoBrainSBC] moveUnassignedToClub error", err);
        }
    };

    const fetchMarketPrice = async (player) => {
        if (!player) return null;

        const DEFAULT_TIERS = [
            { min: 0, inc: 50 },
            { min: 1000, inc: 100 },
            { min: 10000, inc: 250 },
            { min: 50000, inc: 500 },
            { min: 100000, inc: 1000 },
            { min: 200000, inc: 2000 },
            { min: 500000, inc: 5000 },
            { min: 1000000, inc: 10000 },
        ];
        const tiers =
            Array.isArray(UTCurrencyInputControl?.PRICE_TIERS) && UTCurrencyInputControl.PRICE_TIERS.length
            ? [...UTCurrencyInputControl.PRICE_TIERS].sort((a, b) => a.min - b.min)
            : DEFAULT_TIERS;

        const MAX_RESULTS = 21;
        const MAX_CAP_LIMIT = 15000000;

        let bestListing = null;
        let bestPrice = Number.POSITIVE_INFINITY;

        const registerCandidate = (price, item) => {
            if (!Number.isFinite(price) || !item) return;
            if (price < bestPrice || !bestListing) { bestPrice = price; bestListing = item; }
        };

        const getIncrement = (price) => {
            let inc = tiers[0]?.inc || 50;
            for (const tier of tiers) {
                if (price >= tier.min) inc = tier.inc; else break;
            }
            return inc || 50;
        };
        const alignDown = (price) => {
            if (!Number.isFinite(price) || price <= 0) return 0;
            const inc = getIncrement(price);
            return Math.max(0, Math.floor(price / inc) * inc);
        };
        const alignUp = (price) => {
            if (!Number.isFinite(price) || price <= 0) return 0;
            const inc = getIncrement(price);
            return Math.max(0, Math.ceil(price / inc) * inc);
        };

        const limits = player._itemPriceLimits || {};
        const MIN_CAP = alignDown(Math.max(0, limits.minimum || 0));
        const MAX_CAP = Math.min(MAX_CAP_LIMIT, alignUp(Math.max(limits.maximum || MAX_CAP_LIMIT, MIN_CAP || 0)));

        const searchViewModel = new UTBucketedItemSearchViewModel();
        const ensurePlayerFilter = (criteria) => { criteria.defId = [player.definitionId]; return criteria; };
        const getBaseCriteria = () => { const base = searchViewModel.searchCriteria || {}; searchViewModel.searchCriteria = ensurePlayerFilter(base); return searchViewModel.searchCriteria; };
        const buildCriteria = (maxBuy) => {
            const criteria = getBaseCriteria();
            if (typeof maxBuy === "number" && Number.isFinite(maxBuy) && maxBuy > 0) criteria.maxBuy = Math.floor(maxBuy);
            else delete criteria.maxBuy;
            return criteria;
        };

        const stepDown = (price) => {
            if (!Number.isFinite(price) || price <= 0) return 0;
            let current = alignDown(price);
            let guard = 0;
            while (current > MIN_CAP && guard < 5) {
                const inc = getIncrement(current);
                const next = alignDown(Math.max(MIN_CAP, current - inc));
                if (next !== current) return Math.max(next, MIN_CAP);
                current = Math.max(MIN_CAP, current - inc);
                guard += 1;
            }
            return MIN_CAP;
        };
        const stepUp = (price) => {
            const base = Math.max(0, Number(price) || 0);
            let current = alignUp(base);
            let guard = 0;
            while (guard < 5) {
                const inc = getIncrement(current || base || 0);
                const next = alignUp(current + inc);
                if (next > current) return Math.min(next, MAX_CAP);
                current = Math.min(current + inc, MAX_CAP);
                guard += 1;
            }
            return Math.min(current, MAX_CAP);
        };

        const doSearch = async (maxBuy) => new Promise((resolve) => {
            services.Item.clearTransferMarketCache();
            const criteria = buildCriteria(maxBuy);
            services.Item.searchTransferMarket(criteria, 1).observe(undefined, (_s, response) => {
                const items = Array.isArray(response?.data?.items)
                    ? response.data.items.filter((item) => item._auction && item._auction.tradeState === "active")
                    : [];
                resolve(items);
            });
        });

        const extractBuy = (item) =>
            item && item._auction && typeof item._auction.buyNowPrice === "number"
            ? item._auction.buyNowPrice : Number.POSITIVE_INFINITY;

        const evaluate = async (cap) => {
            let bounded = cap;
            if (bounded !== undefined && bounded !== null) bounded = Math.min(MAX_CAP, Math.max(MIN_CAP, bounded));
            const rawEntries = await doSearch(bounded);
            const entries = Array.isArray(rawEntries) ? rawEntries : [];
            const priceList = [];
            let minItem = null;
            let minPrice = Number.POSITIVE_INFINITY;
            for (const entry of entries) {
                const price = extractBuy(entry);
                if (!Number.isFinite(price)) continue;
                priceList.push(price);
                if (price < minPrice) { minPrice = price; minItem = entry; }
            }
            registerCandidate(minPrice, minItem);
            return { count: priceList.length, min: priceList.length ? minPrice : Number.POSITIVE_INFINITY, item: minItem };
        };

        const refineBetween = async (emptyCap, filledCap) => {
            let low = Math.max(MIN_CAP, emptyCap || MIN_CAP);
            let high = Math.max(low + getIncrement(filledCap || low), filledCap);
            high = Math.min(high, MAX_CAP);
            let guard = 0;
            while (low + getIncrement(high) < high && guard < 40) {
                const rawMid = Math.floor((low + high) / 2);
                let mid = alignUp(rawMid);
                if (mid <= low) mid = alignUp(low + getIncrement(low || high));
                if (mid >= high) mid = alignDown(high - getIncrement(high));
                if (mid <= low || mid >= high) break;
                const midEval = await evaluate(mid);
                guard += 1;
                if (midEval.count === 0) low = mid;
                else {
                    if (midEval.count < MAX_RESULTS) return Number.isFinite(bestPrice) ? bestPrice : Number.isFinite(midEval.min) ? midEval.min : Number.POSITIVE_INFINITY;
                    high = mid;
                }
            }
            return Number.isFinite(bestPrice) ? bestPrice : Number.POSITIVE_INFINITY;
        };

        const ensureResults = async (cap) => {
            let upper = cap !== null ? alignUp(Math.max(cap, MIN_CAP)) : null;
            let evalResult = await evaluate(upper);
            if (evalResult.count === 0) {
                let low = upper ?? MIN_CAP;
                let high = upper ?? Math.max(MIN_CAP, stepUp(MIN_CAP));
                let guard = 0;
                while (evalResult.count === 0 && guard < 50 && high <= MAX_CAP) {
                    low = high; high = stepUp(high); evalResult = await evaluate(high); guard += 1;
                }
                if (evalResult.count === 0) {
                    const fallback = await evaluate(undefined);
                    if (!fallback.count) return { cap: null, eval: fallback };
                    if (fallback.count < MAX_RESULTS) return { cap: null, eval: fallback };
                    upper = alignUp(fallback.min);
                    evalResult = await evaluate(upper);
                    if (!evalResult.count) {
                        const stepped = stepUp(upper);
                        evalResult = await evaluate(stepped);
                        return { cap: stepped, eval: evalResult };
                    }
                    return { cap: upper, eval: evalResult };
                }
                return { cap: high, lowerBound: low, eval: evalResult };
            }
            return { cap: upper, eval: evalResult };
        };

        const stored = getPrice(player);
        const startCap = Number.isFinite(stored) && stored > 0 ? Math.min(MAX_CAP, Math.max(MIN_CAP, stored)) : null;

        let { cap: upperCap, lowerBound, eval: upperEval } = await ensureResults(startCap);
        if (upperEval.count === 0) return null;
        if (upperEval.count < MAX_RESULTS) return bestListing;

        if (!upperCap || !Number.isFinite(upperCap)) {
            upperCap = alignUp(upperEval.min);
            upperEval = await evaluate(upperCap);
            if (upperEval.count === 0) {
                const stepped = stepUp(upperCap);
                upperCap = stepped;
                upperEval = await evaluate(upperCap);
                if (upperEval.count === 0) return null;
                if (upperEval.count < MAX_RESULTS) return bestListing;
            }
            if (upperEval.count < MAX_RESULTS) return bestListing;
        }

        let lowerCapValue = lowerBound ?? stepDown(upperCap);
        let lowerEval = await evaluate(lowerCapValue);
        let guardDown = 0;
        while (lowerCapValue > MIN_CAP && lowerEval.count > 0 && guardDown < 50) {
            if (lowerEval.count < MAX_RESULTS) return bestListing;
            upperCap = lowerCapValue;
            lowerCapValue = stepDown(lowerCapValue);
            lowerEval = await evaluate(lowerCapValue);
            guardDown += 1;
        }

        if (lowerEval.count === 0) {
            await refineBetween(lowerCapValue, upperCap);
            return Number.isFinite(bestPrice) ? bestListing : null;
        }
        return bestListing;
    };

    const buyConceptPlayer = async (item, options = {}) => {
        const { suppressNotifications = false } = options;
        const notify = (message, type) => { if (!suppressNotifications) showNotification(message, type); };

        // 计算允许加价后的最高价格 / Compute max allowed price after N increment steps above baseline
        const computeMaxAllowedPrice = (basePrice, steps) => {
            if (!steps || steps <= 0) return basePrice;
            let price = basePrice;
            for (let i = 0; i < steps; i++) {
                const next = UTCurrencyInputControl?.getIncrementAboveVal?.(price);
                if (typeof next === "number" && next > price) price = next;
                else break;
            }
            return price;
        };

        try {
            // 购买前检查俱乐部是否已有相同 definitionId 的球员 / Check club for duplicate before buying
            const clubPlayers = await fetchPlayers();
            const alreadyOwned = clubPlayers.some((p) => p.definitionId === item.definitionId);
            if (alreadyOwned) {
                console.log(`[NoBrainSBC] 跳过已拥有球员 / Skipping already owned player: defId=${item.definitionId}`);
                return { success: false, reason: "alreadyOwned" };
            }

            const baselinePrice = Number(getPrice(item));
            if (!Number.isFinite(baselinePrice) || baselinePrice <= 0) {
                notify(L("notify.noCachedPrice"), UINotificationType.NEGATIVE);
                return { success: false, reason: "noCachedPrice" };
            }

            const listing = await fetchMarketPrice(item);
            const listingPrice = Number(listing?._auction?.buyNowPrice);
            if (!Number.isFinite(listingPrice) || listingPrice <= 0) {
                notify(L("notify.noActiveListing"), UINotificationType.NEGATIVE);
                return { success: false, reason: "noListing" };
            }

            const lowestPrice = listingPrice;
            const priceLabel = lowestPrice.toLocaleString();

            const maxIncrements = Number(getOwnSettings().maxPriceIncrements ?? SETTINGS_DEFAULTS.maxPriceIncrements) || 0;
            const maxAllowedPrice = computeMaxAllowedPrice(baselinePrice, maxIncrements);
            if (lowestPrice > maxAllowedPrice) {
                notify(L("notify.priceTooHigh", priceLabel, maxAllowedPrice.toLocaleString()), UINotificationType.NEGATIVE);
                return { success: false, reason: "priceAboveBaseline", price: lowestPrice, priceLabel, baseline: maxAllowedPrice, baselineLabel: maxAllowedPrice.toLocaleString() };
            }

            const bidAttempt = services.Item.bid(listing, lowestPrice);
            if (bidAttempt && typeof bidAttempt.observe === "function") {
                return await new Promise((resolve) => {
                    bidAttempt.observe({}, async (_obs, response) => {
                        const success = response?.success !== false;
                        if (success) {
                            try { await moveUnassignedToClub(); } catch (err) { console.error("[NoBrainSBC] moveUnassignedToClub error", err); }
                        }
                        notify(
                            success ? L("notify.buySuccess", priceLabel) : L("notify.buyFailed"),
                            success ? UINotificationType.POSITIVE : UINotificationType.NEGATIVE
                        );
                        resolve({ success, reason: success ? "success" : "bidFailed", price: lowestPrice, priceLabel });
                    });
                });
            }

            notify(L("notify.buyAttempted", priceLabel), UINotificationType.POSITIVE);
            return { success: true, reason: "attempted", price: lowestPrice, priceLabel };
        } catch (error) {
            console.error("[NoBrainSBC] buyConceptPlayer error", error);
            notify(L("notify.buyEncounterError"), UINotificationType.NEGATIVE);
            return { success: false, reason: "error", error };
        }
    };

    let _buyAborted = false;

    const getOrCreateBuyStatusPanel = () => {
        const panelId = "nobrain-buy-squad-status";
        let container = document.getElementById(panelId);
        if (!container) {
            container = document.createElement("div");
            container.id = panelId;
            container.className = "nobrain-buy-panel";

            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.textContent = "×";
            closeBtn.setAttribute("aria-label", L("misc.closePanel"));
            closeBtn.className = "nobrain-panel-close";
            closeBtn.addEventListener("click", () => { _buyAborted = true; container.style.display = "none"; });

            const content = document.createElement("div");
            content.className = "nobrain-buy-content";

            const footer = document.createElement("div");
            footer.className = "nobrain-buy-footer";

            container.append(closeBtn, content, footer);
            document.body.appendChild(container);
        }
        const content = container.querySelector(".nobrain-buy-content");
        const footer = container.querySelector(".nobrain-buy-footer");
        return { container, content, footer };
    };

    const getConceptsInSquad = () => {
        const controller = cntlr.current();
        const _squad = controller?._squad || controller?._challenge?.squad;
        const squadPlayers = Array.isArray(_squad?._players) ? _squad._players : [];
        return squadPlayers.map((slot) => slot?._item).filter((item) => item && item.concept);
    };

})();
