// ==UserScript==
// @name         EAFC 26 Nobrain SBC
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Offline SBC solver using greedy + hill climbing, no backend required
// @author       Harvey Hu
// @match        https://www.easports.com/*/ea-sports-fc/ultimate-team/web-app/*
// @match        https://www.ea.com/ea-sports-fc/ultimate-team/web-app/*
// @grant        GM_addStyle
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
`);

(function () {
    "use strict";

    // ─── Constants ───────────────────────────────────────────────────────────────
    const DEFAULT_SEARCH_BATCH_SIZE = 91;
    const HILL_CLIMB_MAX_ITER = 5000;

    // ─── Utilities ───────────────────────────────────────────────────────────────
    const showNotification = (message, type) => {
        const t = type !== undefined ? type : UINotificationType.POSITIVE;
        services.Notification.queue([message, t]);
    };

    const getControllerInstance = () => {
        try {
            const controller = _appMain._rootViewController.currentController.currentController.currentController;
            return controller.childViewControllers?.[0] || controller;
        } catch (e) {
            return null;
        }
    };

    const isPhone = () => document.body.classList.contains("phone");

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

    // ─── Price Cache (shared IndexedDB with main script) ─────────────────────────
    let cachedPriceItems = null;

    const loadPriceItems = () => {
        return new Promise((resolve) => {
            if (cachedPriceItems) { resolve(cachedPriceItems); return; }
            const request = indexedDB.open("futSBCDatabase", 2);
            request.onsuccess = (event) => {
                const db = event.target.result;
                const tx = db.transaction(["priceItems"], "readonly");
                const store = tx.objectStore("priceItems");
                const get = store.get("allPriceItems");
                get.onsuccess = (e) => {
                    cachedPriceItems = (e.target.result && e.target.result.data) ? e.target.result.data : {};
                    resolve(cachedPriceItems);
                };
                get.onerror = () => { cachedPriceItems = {}; resolve({}); };
            };
            request.onerror = () => { cachedPriceItems = {}; resolve({}); };
        });
    };

    const getPrice = (item) => {
        if (!cachedPriceItems) return null;
        return cachedPriceItems[item.definitionId]?.price || null;
    };

    // ─── Shared Settings ──────────────────────────────────────────────────────────
    const getSharedSettings = (id) => {
        try {
            const s = JSON.parse(localStorage.getItem("sbcSolverSettings") || "{}");
            return s?.sbcSettings?.[0]?.[0]?.[id] ?? s?.[id];
        } catch (e) { return undefined; }
    };

    // ─── Fixed / Locked Items ─────────────────────────────────────────────────────
    const FIXED_ITEMS_KEY = "fixeditems";

    const getFixedItems = () => {
        try { return JSON.parse(localStorage.getItem(FIXED_ITEMS_KEY)) || []; }
        catch (e) { return []; }
    };

    const getLockedItems = () => {
        try { return getSharedSettings("excludePlayers") || []; }
        catch (e) { return []; }
    };

    const isItemFixed = (item) => getFixedItems().includes(item.id);
    const isItemLocked = (item) => getLockedItems().includes(item.definitionId);

    // ─── Player Fetching ──────────────────────────────────────────────────────────
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

    // ─── Squad Rating Formula ─────────────────────────────────────────────────────
    const calcSquadRating = (ratings) => {
        const total = ratings.reduce((a, b) => a + b, 0);
        const avg = total / 11;
        const excess = ratings.reduce((a, r) => a + (r > avg ? r - avg : 0), 0);
        return Math.min(Math.max(Math.floor((total + excess + 0.5) / 11), 0), 99);
    };

    // ─── Chemistry Calculation ────────────────────────────────────────────────────
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

    // ─── Constraint Checking ──────────────────────────────────────────────────────
    const checkConstraints = (squad, formation, constraints) => {
        const players = squad.filter(Boolean);
        // Must have all non-brick slots filled (formation[i] !== -1 means it's a real slot)
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
                const cnt = players.filter(p => vals.includes(p.rating)).length;
                if (!satisfies(cnt, count, "GREATER")) return false;
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

    // ─── Cost Calculation ─────────────────────────────────────────────────────────
    const squadCost = (squad) => {
        return squad.reduce((total, p) => {
            if (!p || p.isFixed) return total;
            return total + (p.price || 15000000);
        }, 0);
    };

    // ─── Pre-filter player pool by "all 11" constraints ──────────────────────────
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

    // ─── Greedy Initial Solution ──────────────────────────────────────────────────
    const greedySolve = (players, sbcData) => {
        const { formation, brickIndices, constraints } = sbcData;
        const squad = new Array(11).fill(null);

        // Place bricks first
        for (const idx of brickIndices) {
            const brickId = sbcData.currentSolution[idx];
            if (brickId) {
                const p = players.find(pl => pl.id === brickId);
                if (p) squad[idx] = p;
            }
        }

        // Pre-filter pool by "all 11" constraints
        const totalSlots = formation.filter(f => f !== -1).length;
        const filteredPlayers = preFilterPlayers(players, constraints, totalSlots);

        // Sort by price ascending
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

    // ─── Heuristic score for guiding search toward feasibility ───────────────────
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

    // ─── Hill Climbing Local Search ───────────────────────────────────────────────
    let _localSearchCount = 0;
    const localSearch = async (initialSquad, players, sbcData, maxIter = HILL_CLIMB_MAX_ITER, onProgress = null) => {
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

        // Phase 1: multiple inner restarts, each starting fresh from initialSquad.
        // Each ILS perturbation leads to genuinely different explorations,
        // giving Phase 2 different starting points to escape local optima.
        const INNER_RESTARTS = 6;
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
                    // Try position-matched first, fall back to any player if pool is too small
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
                // Fall back to any available player if position-strict pool is empty
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
                if (onProgress && iter % 100 === 0) {
                    onProgress(`restart ${restart + 1}/${INNER_RESTARTS}, iter ${iter}/${itersPerRestart}`);
                    await new Promise(r => setTimeout(r, 0));
                }
            }
        }

        if (bestCost === Infinity) return { squad: bestSquad, cost: bestCost, feasible: false, lsId: _lsId };

        // Phase 2: systematic greedy cost minimization - shuffle slot order each pass
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

                for (const candidate of available) {
                    if ((candidate.price || 15000000) >= currentPrice) break;
                    if (usedDbIds.has(candidate.databaseId)) {
                        continue;
                    }
                    const newSquad = [...bestSquad];
                    newSquad[slot] = candidate;
                    const ok = checkConstraints(newSquad, formation, constraints);
                    if (ok) {
                        bestSquad = newSquad;
                        bestCost = squadCost(bestSquad);
                        improved = true;
                        break;
                    }
                }
            }
        }

        return { squad: bestSquad, cost: bestCost, feasible: true, lsId: _lsId };
    };

    // ─── Save Squad ───────────────────────────────────────────────────────────────
    const saveSquad = async (_challenge, _squad, solutionPlayers) => {
        _squad.removeAllItems();
        _squad.setPlayers(solutionPlayers, true);
        await services.SBC.saveChallenge(_challenge).observe(this, async (z, d) => {
            if (!d.success) {
                hideLoader();
                showNotification("Failed to save squad", UINotificationType.NEGATIVE);
                return;
            }
            services.SBC.loadChallengeData(_challenge).observe(this, async (z2, data) => {
                try {
                    const squad = data.response.squad;
                    hideLoader();
                    const ps = squad._players.map(p => p._item);
                    _challenge.squad.setPlayers(ps, true);
                    _challenge.onDataChange.notify({ squad });
                    if (isPhone() && _appMain._rootViewController.currentController.className === "UTSBCSquadDetailPanelViewController") {
                        setTimeout(() => {
                            _appMain._rootViewController.currentController.parentViewController._eBackButtonTapped();
                        }, 500);
                    }
                } catch (e) {
                    hideLoader();
                }
            });
        });
    };

    // ─── Main Offline Solver ──────────────────────────────────────────────────────
    const offlineSolveSBC = async (_challenge) => {
        showLoader();
        const solveStart = Date.now();
        const updateProgress = (text) => {
            const elapsed = ((Date.now() - solveStart) / 1000).toFixed(1);
            updateLoaderText(`${text} (${elapsed}s)`);
        };
        showNotification("Offline solver starting...", UINotificationType.POSITIVE);

        try {
            // Build sbcData from challenge
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

            // Fetch club players + storage (unassigned) players
            const [clubPlayers, storagePlayers] = await Promise.all([fetchPlayers(), getStoragePlayers()]);
            // Mark storage players so price discount can be applied
            storagePlayers.forEach(p => { p.isStorage = true; });
            // Merge: storage replaces club version of same definitionId (storage gets discount)
            const storageDefIds = new Set(storagePlayers.map(p => p.definitionId));
            const rawPlayers = [
                ...clubPlayers.filter(p => !storageDefIds.has(p.definitionId)),
                ...storagePlayers,
            ];

            // Collect active squad player IDs to exclude
            const activeSquadPlayerIds = new Set();
            try {
                repositories.Squad.squads
                    .get(services.User.getUser().selectedPersona)
                    .get(services.Squad.activeSquad)
                    .getPlayers()
                    .forEach(p => { if (p.item?.id > 0) activeSquadPlayerIds.add(p.item.id); });
            } catch (e) {}

            // Load price cache async
            await loadPriceItems();
            // Fill missing CBR entries (ratings < 45 not covered by main script)
            for (let i = 1; i <= 81; i++) {
                if (!cachedPriceItems[i + "_CBR"] || !cachedPriceItems[i + "_CBR"].price) {
                    cachedPriceItems[i + "_CBR"] = { price: i < 75 ? 200 : 400 };
                }
            }

            // Setup chem util for normalizeClubId and maxChem
            const chemUtil = new UTSquadChemCalculatorUtils();
            chemUtil.chemService = services.Chemistry;
            chemUtil.teamConfigRepo = repositories.TeamConfig;
            rawPlayers.forEach(item => {
                item.profile = chemUtil.getChemProfileForPlayer(item);
                item.normalizeClubId = chemUtil.normalizeClubId(item.teamId);
                if (!item.groups || !item.groups.length) item.groups = [0];
            });

            // Read shared settings
            const excludeSbc        = getSharedSettings("excludeSbc")        || false;
            const excludeObjective  = getSharedSettings("excludeObjective")  || false;
            const excludeSpecial    = getSharedSettings("excludeSpecial")    || false;
            const excludeTradable   = getSharedSettings("excludeTradable")   || false;
            const excludeExtinct    = getSharedSettings("excludeExtinct")    || false;
            const excludeLockedPlayers = getLockedItems();
            const duplicateDiscount   = getSharedSettings("duplicateDiscount")   ?? 50;
            const untradeableDiscount = getSharedSettings("untradeableDiscount") ?? 80;

            // Map to solver format, filtering loans/timelimited/settings
            const players = rawPlayers
                .filter(item => item.isPlayer && item.isPlayer())
                .filter(item => item.loans < 0)
                .filter(item => !item.isTimeLimited())
                .filter(item => !activeSquadPlayerIds.has(item.id))
                .filter(item => !(item.isSpecial && item.isSpecial() && excludeSpecial))
                .filter(item => !(item.isTradeable && item.isTradeable() && excludeTradable))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isSbc && excludeSbc))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isObjective && excludeObjective))
                .filter(item => !excludeLockedPlayers.includes(item.definitionId))
                .filter(item => !(cachedPriceItems[item.definitionId]?.isExtinct && excludeExtinct))
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
                showNotification("No players found in club", UINotificationType.NEGATIVE);
                return;
            }

            // Iterative rating window: start tight [target-1, target+1], expand by 1 each side until solution found
            const ratingReq = sbcData.constraints.find(r => r.requirementKey === "TEAM_RATING" && r.scope === "GREATER");
            const ratingTarget = ratingReq ? ratingReq.eligibilityValues[0] : 0;
            const maxFloorDrop = ratingTarget >= 84 ? 4 : (ratingTarget > 0 ? 99 : 0);

            let bestResult = { feasible: false, cost: Infinity };
            let bestCappedPlayers = players;

            // Check if current squad already satisfies constraints
            const playerById = new Map(players.map(p => [p.id, p]));
            const currentSquad = _challenge.squad._players.slice(0, 11).map(m => playerById.get(m._item?.id) || null);
            if (checkConstraints(currentSquad, sbcData.formation, sbcData.constraints)) {
                bestResult = { feasible: true, cost: squadCost(currentSquad), squad: currentSquad, lsId: 0 };
                bestCappedPlayers = players;
                console.log(`[offline] current squad is feasible, skipping search, cost=${bestResult.cost}`);
            }

            // Find the minimum window that yields a feasible solution
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
                        updateProgress(`求解进度：${pct}%`);
                    } else {
                        updateProgress(t);
                    }
                };
                const result = await localSearch(squad, cappedPlayers, sbcData, undefined, lsProgressCb);
                if (result.feasible) {
                    if (result.cost < bestResult.cost) { bestCappedPlayers = cappedPlayers; bestResult = result; }
                    // Try one more expansion to find cheaper solution with wider player pool
                    const cap2 = ratingTarget > 0 ? cap + 1 : 99;
                    const floorDrop2 = ratingTarget > 0 ? Math.min(expand + 1, maxFloorDrop) : 0;
                    const ratingFloor2 = ratingTarget > 0 ? ratingTarget - 1 - floorDrop2 : 0;
                    const cappedPlayers2 = ratingTarget > 0 ? players.filter(p => p.rating <= cap2 && p.rating >= ratingFloor2) : players;
                    const squad2 = greedySolve(cappedPlayers2, sbcData);
                    const result2 = await localSearch(squad2, cappedPlayers2, sbcData, undefined, lsProgressCb);
                    if (result2.feasible && result2.cost < bestResult.cost) { bestCappedPlayers = cappedPlayers2; bestResult = result2; }
                    const logSquad = (label, r) => {
                        const { totalChem } = calcChemistry(r.squad, sbcData.formation);
                        console.log(`[${label}] cost=${r.cost} chem=${totalChem}`, r.squad.map(p => p ? `${p.name}(${p.rating})` : 'null'));
                    };
                    logSquad('best after expand', bestResult);
                    break;
                }
            }

            if (!bestResult.feasible) {
                hideLoader();
                showNotification("Offline solver: no solution found", UINotificationType.NEGATIVE);
                return;
            }

            // Iterated Local Search: stop after 15 consecutive rounds with no improvement
            const ILS_NO_IMPROVE_LIMIT = 15;
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
                const ilsBase = ilsNoImprove * HILL_CLIMB_MAX_ITER;
                const ilsTotal = ILS_NO_IMPROVE_LIMIT * HILL_CLIMB_MAX_ITER;
                for (const slot of toPerturb) perturbed[slot] = null;
                const result = await localSearch(perturbed, bestCappedPlayers, sbcData, undefined, t => {
                    const match = t.match(/iter (\d+)/);
                    if (match) {
                        const pct = ((ilsBase + parseInt(match[1])) / ilsTotal * 100).toFixed(1);
                        updateLoaderText(`优化进度：${pct}%`);
                    }
                });
                if (result.feasible && result.cost < bestResult.cost) {
                    bestResult = result;
                    const { totalChem } = calcChemistry(bestResult.squad, sbcData.formation);
                    console.log(`[ILS ${ilsIter}] improved cost=${bestResult.cost} chem=${totalChem}`, bestResult.squad.map(p => p ? `${p.name}(${p.rating})` : 'null'));
                    ilsNoImprove = 0;
                } else {
                    ilsNoImprove++;
                }
            }

            // Rating downgrade pass: replace highest-rated player with lowest-rated valid substitute
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
                    for (const candidate of downgradPool) {
                        if (candidate.rating >= worstRating) break;
                        if (usedDbIds.has(candidate.databaseId)) continue;
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

            // Build solution player list for saveSquad
            console.log(`[final] selected localSearch #${bestResult.lsId} cost=${bestResult.cost}`);
            const _squad = getControllerInstance()?._squad || getControllerInstance()?._challenge?.squad;
            if (!_squad) {
                hideLoader();
                showNotification("Could not get squad reference", UINotificationType.NEGATIVE);
                return;
            }

            const solutionPlayers = new Array(11).fill(null);

            bestResult.squad.forEach((p, idx) => {
                if (!p) return;
                const match = rawPlayers.find(cp => cp.id === p.id);
                if (match) {
                    solutionPlayers[idx] = match;
                } else {
                    const conceptPlayer = new UTItemEntity();
                    conceptPlayer.definitionId = p.definitionId;
                    conceptPlayer.stackCount = 1;
                    conceptPlayer.id = p.definitionId;
                    conceptPlayer.concept = true;
                    solutionPlayers[idx] = conceptPlayer;
                }
            });

            await saveSquad(_challenge, _squad, solutionPlayers);
            showNotification("Offline solve complete!", UINotificationType.POSITIVE);

        } catch (e) {
            hideLoader();
            showNotification("Offline solver error: " + e.message, UINotificationType.NEGATIVE);
        }
    };

    // ─── Button Injection ─────────────────────────────────────────────────────────
    const squadDetailPanelViewInit = UTSBCSquadDetailPanelView.prototype.init;
    UTSBCSquadDetailPanelView.prototype.init = function (...args) {
        const response = squadDetailPanelViewInit.call(this, ...args);

        const offlineBtn = createButton("idOfflineSolveSbc", "Offline Solve", async () => {
            const { _challenge } = getControllerInstance();
            if (!_challenge) {
                showNotification("No challenge found", UINotificationType.NEGATIVE);
                return;
            }
            await offlineSolveSBC(_challenge);
        });

        offlineBtn.style.flex = "1";
        offlineBtn.classList.add("mini");

        // Find the existing button container and append
        const existingBtn = document.getElementById("idSolveSbcNC");
        if (existingBtn && existingBtn.parentNode) {
            existingBtn.parentNode.appendChild(offlineBtn);
        } else {
            // Fallback: insert before exchange button
            try {
                const container = document.createElement("div");
                container.style.display = "flex";
                container.style.gap = "0.5rem";
                container.style.width = "95%";
                container.style.padding = "0 0.5rem";
                offlineBtn.style.flex = "1";
                container.appendChild(offlineBtn);
                this._btnExchange.__root.parentNode.insertBefore(container, this._btnExchange.__root);
            } catch (e) {
                /* ignore injection error */
            }
        }

        return response;
    };

})();
