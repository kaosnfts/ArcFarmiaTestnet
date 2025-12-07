import React, { useEffect, useMemo, useState } from "react";
import samImg from "./assets/sam.png";
import timImg from "./assets/tim.png";
import sunImg from "./assets/sun.svg";
import moonImg from "./assets/moon.svg";
import cloud1Img from "./assets/cloud1.svg";
import cloud2Img from "./assets/cloud2.svg";
import cloud3Img from "./assets/cloud3.svg";
import backpackImg from "./assets/backpack.svg";

import sfxPlant from "./assets/sfx_plant.wav";
import sfxWater from "./assets/sfx_water.wav";
import sfxHarvest from "./assets/sfx_harvest.wav";
import sfxEgg from "./assets/sfx_egg.wav";
import sfxMilk from "./assets/sfx_milk.wav";
import sfxShop from "./assets/sfx_shop.wav";
import sfxQuest from "./assets/sfx_quest.wav";

import { BrowserProvider, Contract } from "ethers";
import { ARCFARMIA_ADDRESS, ARCFARMIA_ABI } from "./contractConfig";
import { SAVE_CONTRACT_ADDRESS, SAVE_CONTRACT_ABI } from "./saveConfig";

// 👉 IMPORT DA TELA DE LOADING
import LoadingScreen from "./LoadingScreen";

const GRID_COLS = 8;
const GRID_ROWS = 6;
const TOTAL_TILES = GRID_COLS * GRID_ROWS;

const LOCAL_SAVE_KEY = "arcfarmia_local_save_v1";

// Crop config com tempos em ms
const CROPS = [
  {
    id: "wheat",
    name: "Wheat",
    growTime: 20_000, // 20s para testar rápido
    buyPrice: 3,
    sellPrice: 5,
    xpReward: 2,
    emojiSeed: "🌱",
    emojiReady: "🌾",
  },
  {
    id: "corn",
    name: "Corn",
    growTime: 3 * 60 * 1000, // 3 minutos
    buyPrice: 6,
    sellPrice: 12,
    xpReward: 6,
    emojiSeed: "🌿",
    emojiReady: "🌽",
  },
  {
    id: "carrot",
    name: "Carrot",
    growTime: 7 * 60 * 1000, // 7 minutos
    buyPrice: 5,
    sellPrice: 11,
    xpReward: 5,
    emojiSeed: "🥕",
    emojiReady: "🥕",
  },
];

const CROP_ID_ONCHAIN = {
  wheat: 1, // ID do trigo no contrato
  corn: 2,  // ID do milho no contrato
  carrot: 3 // ID da cenoura no contrato
};

// Animals & barn products
const ANIMALS = [
  {
    id: "chicken",
    name: "Chicken",
    emoji: "🐔",
    buyPrice: 25,
    produceId: "egg",
    produceName: "Egg",
    produceEmoji: "🥚",
    produceTime: 10 * 60 * 1000, // 10 minutos
  },
  {
    id: "cow",
    name: "Cow",
    emoji: "🐄",
    buyPrice: 60,
    produceId: "milk",
    produceName: "Milk",
    produceEmoji: "🥛",
    produceTime: 21 * 60 * 1000, // 21 minutos
  },
];

const LIVESTOCK_PRODUCTS = [
  { id: "egg", name: "Egg", emoji: "🥚", sellPrice: 8, xpReward: 15 },
  { id: "milk", name: "Milk", emoji: "🥛", sellPrice: 15, xpReward: 24 },
];

const DAILY_QUESTS = [
  {
    id: "plant_10",
    label: "Plant 10 crops",
    statKey: "planted",
    target: 10,
    reward: 10,
  },
  {
    id: "harvest_5",
    label: "Harvest 5 crops",
    statKey: "harvested",
    target: 5,
    reward: 15,
  },
  {
    id: "eggs_3",
    label: "Collect 3 eggs",
    statKey: "eggsCollected",
    target: 3,
    reward: 20,
  },
];

function makeEmptyTile() {
  return {
    state: "empty",
    plantedAt: 0,
    cropId: null,
  };
}

function createInitialField() {
  return Array.from({ length: TOTAL_TILES }, () => makeEmptyTile());
}

function createInitialBarn() {
  return Array.from({ length: 6 }, () => ({
    animalId: null,
    startedAt: 0,
    lastCollectedAt: 0,
  }));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning ☀️";
  if (h < 18) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

function getTimeOfDayTag() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

function playSound(src, volume = 0.6) {
  if (!src) return;
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
}

function xpForLevelUp(level) {
  // Progressive XP curve: each level needs more XP que o anterior
  return 30 + level * 20 + level * level * 10;
}

// garante que a quantidade de sementes é sempre número válido >= 0
function getSeedCount(seedsState, cropId) {
  if (!seedsState) return 0;
  const raw = seedsState[cropId];
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

// garante que a quantidade de colheita é sempre número válido >= 0
function getHarvestCount(harvestState, cropId) {
  if (!harvestState) return 0;
  const raw = harvestState[cropId];
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function App() {
  const [field, setField] = useState(createInitialField);
  const [barnSlots, setBarnSlots] = useState(createInitialBarn);
  const [arcCoins, setArcCoins] = useState(50);

  // carteira conectada
  const [walletAddress, setWalletAddress] = useState(null);

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(0);
  const [nextLevelXp, setNextLevelXp] = useState(() => xpForLevelUp(0));
  const [levelUpMessage, setLevelUpMessage] = useState(null);
  const [mode, setMode] = useState("plant");
  const [playerIndex, setPlayerIndex] = useState(0);
  const [greeting, setGreeting] = useState(getGreeting());
  const [selectedCropId, setSelectedCropId] = useState("wheat");
  const [now, setNow] = useState(Date.now());
  const [effects, setEffects] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDayTag());
  const [weather, setWeather] = useState("clear");
  const [showInventory, setShowInventory] = useState(false);

  const [seeds, setSeeds] = useState(() => ({
    wheat: 4,
    corn: 3,
    carrot: 2,
  }));

  const [harvest, setHarvest] = useState(() => ({}));
  const [produce, setProduce] = useState(() => ({ egg: 0, milk: 0 }));

  const [stats, setStats] = useState(() => ({
    planted: 0,
    harvested: 0,
    eggsCollected: 0,
    milkCollected: 0,
  }));
  const [claimedQuests, setClaimedQuests] = useState(() => ({}));

  const cropsById = useMemo(() => {
    const m = {};
    for (const c of CROPS) m[c.id] = c;
    return m;
  }, []);

  const animalsById = useMemo(() => {
    const m = {};
    for (const a of ANIMALS) m[a.id] = a;
    return m;
  }, []);

  // ------- SNAPSHOT LOCAL (para salvar no localStorage) -------
  function buildLocalSnapshot() {
    return {
      arcCoins,
      xp,
      level,
      nextLevelXp,
      seeds,
      harvest,
      produce,
      stats,
      claimedQuests,
      field,
      barnSlots,
    };
  }

  function applyLocalSnapshot(data) {
    try {
      if (!data || typeof data !== "object") return;

      if (typeof data.arcCoins === "number") setArcCoins(data.arcCoins);
      if (typeof data.xp === "number") setXp(data.xp);
      if (typeof data.level === "number") {
        setLevel(data.level);
        setNextLevelXp(xpForLevelUp(data.level));
      }
      if (typeof data.nextLevelXp === "number") {
        // se quiser respeitar exatamente o que foi salvo
        setNextLevelXp(data.nextLevelXp);
      }

      if (data.seeds) setSeeds(data.seeds);
      if (data.harvest) setHarvest(data.harvest);
      if (data.produce) setProduce(data.produce);
      if (data.stats) setStats(data.stats);
      if (data.claimedQuests) setClaimedQuests(data.claimedQuests);
      if (Array.isArray(data.field)) setField(data.field);
      if (Array.isArray(data.barnSlots)) setBarnSlots(data.barnSlots);

      console.log("Snapshot local aplicado:", data);
    } catch (e) {
      console.error("Erro ao aplicar snapshot local:", e);
    }
  }

  // --------- ON-CHAIN: getPlayer / savePlayer ----------

  // Lê o progresso salvo no contrato ArcFarmiaProgress (progresso on-chain)
  async function loadGameStateFromChain(playerAddress, options = {}) {
    const { showAlert = false } = options;

    try {
      if (!playerAddress || typeof window === "undefined" || !window.ethereum) {
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(
        SAVE_CONTRACT_ADDRESS,
        SAVE_CONTRACT_ABI,
        provider
      );

      const data = await contract.getPlayer(playerAddress);

      // ethers v6: pode acessar por nome ou índice
      const coins = Number(data.coins ?? data[0] ?? 0);
      const xpChain = Number(data.xp ?? data[1] ?? 0);
      const levelChain = Number(data.level ?? data[2] ?? 0);
      const wheatSeeds = Number(data.wheatSeeds ?? data[3] ?? 0);
      const cornSeeds = Number(data.cornSeeds ?? data[4] ?? 0);
      const carrotSeeds = Number(data.carrotSeeds ?? data[5] ?? 0);
      const eggsChain = Number(data.eggs ?? data[6] ?? 0);
      const milkChain = Number(data.milk ?? data[7] ?? 0);
      const chickensChain = Number(data.chickens ?? data[8] ?? 0);
      const cowsChain = Number(data.cows ?? data[9] ?? 0);

      const isEmpty =
        coins === 0 &&
        xpChain === 0 &&
        levelChain === 0 &&
        wheatSeeds === 0 &&
        cornSeeds === 0 &&
        carrotSeeds === 0 &&
        eggsChain === 0 &&
        milkChain === 0 &&
        chickensChain === 0 &&
        cowsChain === 0;

      if (isEmpty) {
        // nunca salvou nada: mantém defaults locais
        if (showAlert) {
          alert(
            "Nenhum progresso salvo encontrado na Arc para essa carteira.\n" +
              "Vamos começar do zero. Use o botão 💾 Save to blockchain para gravar."
          );
        }
        return;
      }

      // aplica no estado do jogo (inventário on-chain)
      setArcCoins(coins || 50);
      setXp(xpChain);
      setLevel(levelChain);
      setNextLevelXp(xpForLevelUp(levelChain));

      setSeeds({
        wheat: wheatSeeds,
        corn: cornSeeds,
        carrot: carrotSeeds,
      });

      setProduce({
        egg: eggsChain,
        milk: milkChain,
      });

      console.log("Progresso carregado da Arc:", {
        coins,
        xp: xpChain,
        level: levelChain,
        seeds: { wheatSeeds, cornSeeds, carrotSeeds },
        eggs: eggsChain,
        milk: milkChain,
        chickens: chickensChain,
        cows: cowsChain,
      });

      if (showAlert) {
        alert("Progresso carregado do contrato ArcFarmiaProgress ✅");
      }
    } catch (err) {
      console.warn(
        "Falha ao ler progresso salvo para essa carteira (talvez ainda não exista).",
        err
      );
      if (showAlert) {
        alert(
          "Não consegui ler progresso salvo para essa carteira na Arc.\n" +
            "Vamos começar do zero e você pode salvar depois 👍"
        );
      }
    }
  }

  // Salva o progresso atual no contrato ArcFarmiaProgress
  async function saveProgressOnChain() {
    try {
      if (!walletAddress) {
        alert("Conecte sua carteira antes de salvar o progresso.");
        return;
      }

      if (typeof window === "undefined" || !window.ethereum) {
        alert("Carteira Web3 não encontrada (MetaMask / Rabby).");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(
        SAVE_CONTRACT_ADDRESS,
        SAVE_CONTRACT_ABI,
        signer
      );

      // conta quantas galinhas e vacas temos no estábulo
      const chickensCount = barnSlots.filter(
        (s) => s.animalId === "chicken"
      ).length;
      const cowsCount = barnSlots.filter((s) => s.animalId === "cow").length;

      const tx = await contract.savePlayer(
        BigInt(arcCoins),
        BigInt(xp),
        Number(level),
        BigInt(seeds.wheat ?? 0),
        BigInt(seeds.corn ?? 0),
        BigInt(seeds.carrot ?? 0),
        BigInt(produce.egg ?? 0),
        BigInt(produce.milk ?? 0),
        BigInt(chickensCount),
        BigInt(cowsCount)
      );

      alert(
        "Enviando transação para salvar progresso na Arc... Assine na sua carteira."
      );
      await tx.wait();
      alert("Progresso salvo na Arc ✅");
    } catch (err) {
      console.error("Erro ao salvar progresso na Arc:", err);
      alert("Erro ao salvar progresso na Arc. Veja o console (F12) para detalhes.");
    }
  }

  // Conectar a carteira e carregar progresso on-chain
  async function connectWallet() {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        alert("Carteira Web3 não encontrada (instale MetaMask ou use Rabby).");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        alert("Nenhuma conta encontrada na carteira.");
        return;
      }

      const address = accounts[0];
      setWalletAddress(address);

      // carrega o progresso dessa carteira a partir do contrato de progresso
      await loadGameStateFromChain(address, { showAlert: true });
    } catch (err) {
      console.error("Erro ao conectar carteira:", err);
      alert("Erro ao conectar carteira. Veja o console (F12) para detalhes.");
    }
  }

  function disconnectWallet() {
    setWalletAddress(null);
    // reset visual quando desconectar
    setArcCoins(50);
    setSeeds({
      wheat: 4,
      corn: 3,
      carrot: 2,
    });
    setXp(0);
    setLevel(0);
    setNextLevelXp(xpForLevelUp(0));
    alert("Carteira desconectada do jogo.");
  }

  // -------- LOCAL SAVE: carregar quando abrir --------
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(LOCAL_SAVE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      console.log("Save local encontrado, aplicando...", data);
      applyLocalSnapshot(data);
    } catch (e) {
      console.error("Erro ao ler save local do localStorage:", e);
    }
  }, []);

  // -------- LOCAL SAVE: auto-save sempre que algo importante mudar --------
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const snapshot = buildLocalSnapshot();
      localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(snapshot));
      // console.log("Save local atualizado.");
    } catch (e) {
      console.error("Erro ao salvar no localStorage:", e);
    }
  }, [
    field,
    barnSlots,
    arcCoins,
    xp,
    level,
    nextLevelXp,
    seeds,
    harvest,
    produce,
    stats,
    claimedQuests,
  ]);

  // greeting
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  // clock + time of day + random weather
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setTimeOfDay(getTimeOfDayTag());
      setWeather((prev) => {
        if (Math.random() < 0.1) {
          const choices = ["clear", "rain", "fog"];
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // crop growth loop
  useEffect(() => {
    const id = setInterval(() => {
      setField((prev) =>
        prev.map((t) => {
          if (t.state === "growing" && t.cropId) {
            const crop = cropsById[t.cropId];
            const growTime = crop?.growTime ?? 10000;
            if (Date.now() - t.plantedAt >= growTime) {
              return { ...t, state: "ready" };
            }
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, [cropsById]);

  function triggerEffect(tileIndex, type) {
    const id = Math.random().toString(36).slice(2);
    setEffects((prev) => [...prev, { id, tileIndex, type }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((fx) => fx.id !== id));
    }, 550);
  }

  function grantXp(amount) {
    if (!amount || amount <= 0) return;

    setXp((prevXp) => {
      let totalXp = prevXp + amount;
      let currentLevel = level;
      let xpNeeded = xpForLevelUp(currentLevel);
      let leveledUp = false;
      let finalLevel = currentLevel;

      while (totalXp >= xpNeeded) {
        totalXp -= xpNeeded;
        finalLevel += 1;
        xpNeeded = xpForLevelUp(finalLevel);
        leveledUp = true;
      }

      if (leveledUp) {
        const msgId = Date.now() + Math.random();
        setLevel(finalLevel);
        setNextLevelXp(xpNeeded);
        setLevelUpMessage({ level: finalLevel, id: msgId });
        playSound(sfxShop, 0.9);

        setTimeout(() => {
          setLevelUpMessage((current) =>
            current && current.id === msgId ? null : current
          );
        }, 2200);
      }

      return totalXp;
    });
  }

  function handleTileClick(i) {
    setPlayerIndex(i);

    setField((prev) => {
      const tile = prev[i];
      const next = [...prev];
      const crop = cropsById[selectedCropId];

      if (mode === "plant") {
        if (!crop) return prev;
        if (tile.state !== "empty") return prev;

        const availableSeeds = getSeedCount(seeds, selectedCropId);
        if (availableSeeds <= 0) return prev;

        setSeeds((old) => ({
          ...old,
          [selectedCropId]: getSeedCount(old, selectedCropId) - 1,
        }));

        next[i] = {
          state: "planted",
          plantedAt: 0,
          cropId: selectedCropId,
        };
        setStats((s) => ({ ...s, planted: s.planted + 1 }));
        triggerEffect(i, "plant");
        playSound(sfxPlant, 0.6);
        return next;
      }

      if (mode === "water") {
        if (tile.state !== "planted" || !tile.cropId) return prev;
        next[i] = {
          ...tile,
          state: "growing",
          plantedAt: Date.now(),
        };
        triggerEffect(i, "water");
        playSound(sfxWater, 0.5);
        return next;
      }

      if (mode === "harvest") {
        if (tile.state !== "ready" || !tile.cropId) return prev;
        const cropData = cropsById[tile.cropId];

        setHarvest((old) => {
          const prevCount = getHarvestCount(old, tile.cropId);
          const newCount = prevCount + 1;
          console.log("Colheita:", tile.cropId, "=>", newCount);
          return {
            ...old,
            [tile.cropId]: newCount,
          };
        });

        if (cropData) {
          grantXp(cropData.xpReward);
        }
        setStats((s) => ({ ...s, harvested: s.harvested + 1 }));

        next[i] = makeEmptyTile();
        triggerEffect(i, "harvest");
        playSound(sfxHarvest, 0.7);
        return next;
      }

      return prev;
    });
  }

  // keyboard movement
  useEffect(() => {
    function onKey(e) {
      let idx = playerIndex;
      if (e.key === "ArrowLeft" || e.key === "a")
        idx = Math.max(0, playerIndex - 1);
      if (e.key === "ArrowRight" || e.key === "d")
        idx = Math.min(TOTAL_TILES - 1, playerIndex + 1);
      if (e.key === "ArrowUp" || e.key === "w")
        idx = Math.max(0, playerIndex - GRID_COLS);
      if (e.key === "ArrowDown" || e.key === "s")
        idx = Math.min(TOTAL_TILES - 1, playerIndex + GRID_COLS);
      if (idx !== playerIndex) setPlayerIndex(idx);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playerIndex]);

  // shop actions helper: compra no contrato ArcFarmia
  async function buySeedOnChain(cropKey, amount) {
    const onChainId = CROP_ID_ONCHAIN[cropKey];
    if (onChainId === undefined) {
      alert(
        "Essa cultura não está configurada no contrato. Ajuste CROP_ID_ONCHAIN."
      );
      return;
    }

    if (typeof window === "undefined") return;
    const { ethereum } = window;

    if (!ethereum) {
      alert(
        "Carteira Web3 não encontrada (instale MetaMask ou use Rabby/MetaMask)."
      );
      return;
    }

    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    const contract = new Contract(ARCFARMIA_ADDRESS, ARCFARMIA_ABI, signer);

    const tx = await contract.buySeeds(onChainId, amount);
    console.log("Tx enviada (buySeeds):", tx.hash);
    alert("Transação enviada para a Arc Testnet. Aguarde a confirmação...");

    await tx.wait();
    console.log("Tx confirmada (buySeeds).");
    alert(`Sementes compradas com sucesso na ArcFarmia ✅ (x${amount})`);
  }

  // shop actions
  async function buySeed(id) {
    const crop = cropsById[id];
    if (!crop) return;

    if (!walletAddress) {
      alert("Conecte sua carteira antes de comprar sementes.");
      return;
    }

    if (arcCoins < crop.buyPrice) {
      alert("Você não tem ArcCoins suficientes para comprar essa semente.");
      return;
    }

    try {
      await buySeedOnChain(id, 1);

      // atualiza estado local do jogo
      setArcCoins((c) => c - crop.buyPrice);
      setSeeds((old) => ({
        ...old,
        [id]: getSeedCount(old, id) + 1,
      }));
      playSound(sfxShop, 0.5);
    } catch (err) {
      console.error("Erro ao comprar semente:", err);
      alert("Erro ao comprar semente na rede Arc. Veja o console (F12).");
    }
  }

  async function buySeedPack(id) {
    const crop = cropsById[id];
    if (!crop) return;

    if (!walletAddress) {
      alert("Conecte sua carteira antes de comprar seeds.");
      return;
    }

    const totalPrice = crop.buyPrice * 10;

    if (arcCoins < totalPrice) {
      alert("Você não tem ArcCoins suficientes para comprar o pack x10.");
      return;
    }

    try {
      // compra 10 seeds no contrato
      await buySeedOnChain(id, 10);

      // atualiza estado local
      setArcCoins((c) => c - totalPrice);
      setSeeds((old) => ({
        ...old,
        [id]: getSeedCount(old, id) + 10,
      }));

      playSound(sfxShop, 0.5);
    } catch (err) {
      console.error("Erro ao comprar pack de sementes:", err);
      alert("Erro ao comprar pack x10 na rede Arc. Veja o console (F12).");
    }
  }

  async function claimDailySeedsOnChain() {
    try {
      if (!walletAddress) {
        alert("Conecte sua carteira antes de pegar o daily.");
        return;
      }

      if (typeof window === "undefined" || !window.ethereum) {
        alert("Carteira Web3 não encontrada (instale MetaMask ou use Rabby).");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new Contract(ARCFARMIA_ADDRESS, ARCFARMIA_ABI, signer);

      const tx = await contract.claimDailySeeds();
      console.log("Tx enviada (claimDailySeeds):", tx.hash);
      alert(
        "Transação de daily enviada para a Arc Testnet. Aguardando confirmação..."
      );

      await tx.wait();
      console.log("Tx confirmada (claimDailySeeds).");

      // em outro momento podemos sincronizar inventário local com on-chain
      alert(
        "Daily reivindicado na Arc! 🎁 (em breve o inventário local será atualizado automaticamente com o daily.)"
      );
    } catch (err) {
      console.error("Erro no claimDailySeeds:", err);
      const raw =
        (err && (err.shortMessage || err.reason || err.message)) ||
        String(err);
      alert("Erro ao reivindicar o daily na Arc:\n\n" + raw);
    }
  }

  function sellHarvest(id) {
    const crop = cropsById[id];
    if (!crop) return;
    const amount = getHarvestCount(harvest, id);
    if (amount <= 0) return;
    const gain = amount * crop.sellPrice;
    setArcCoins((c) => c + gain);
    setHarvest((old) => ({
      ...old,
      [id]: 0,
    }));
    playSound(sfxShop, 0.7);
  }

  function sellProduce(productId) {
    const product = LIVESTOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    const amount = produce[productId] ?? 0;
    if (amount <= 0) return;
    const gain = amount * product.sellPrice;
    setArcCoins((c) => c + gain);
    setProduce((old) => ({ ...old, [productId]: 0 }));
    playSound(sfxShop, 0.7);
  }

  // barn actions
  function handleBuyAnimal(slotIndex, animalId) {
    const animal = animalsById[animalId];
    if (!animal) return;
    if (arcCoins < animal.buyPrice) return;

    setBarnSlots((prev) => {
      const slots = [...prev];
      const slot = slots[slotIndex];
      if (!slot || slot.animalId) return prev;
      slots[slotIndex] = {
        animalId,
        startedAt: Date.now(),
        lastCollectedAt: 0,
      };
      return slots;
    });
    setArcCoins((c) => c - animal.buyPrice);
    playSound(sfxShop, 0.5);
  }

  function handleCollectProduce(slotIndex) {
    setBarnSlots((prev) => {
      const slots = [...prev];
      const slot = slots[slotIndex];
      if (!slot || !slot.animalId) return prev;
      const animal = animalsById[slot.animalId];
      if (!animal) return prev;

      const baseTime = slot.lastCollectedAt || slot.startedAt;
      if (!baseTime) return prev;

      const ready = Date.now() - baseTime >= animal.produceTime;
      if (!ready) return prev;

      slots[slotIndex] = {
        ...slot,
        lastCollectedAt: Date.now(),
      };

      setProduce((old) => ({
        ...old,
        [animal.produceId]: (old[animal.produceId] ?? 0) + 1,
      }));

      setStats((s) => ({
        ...s,
        eggsCollected: s.eggsCollected + (animal.produceId === "egg" ? 1 : 0),
        milkCollected: s.milkCollected + (animal.produceId === "milk" ? 1 : 0),
      }));

      const productCfg = LIVESTOCK_PRODUCTS.find(
        (p) => p.id === animal.produceId
      );
      if (productCfg && productCfg.xpReward) {
        grantXp(productCfg.xpReward);
      }

      if (animal.produceId === "egg") {
        playSound(sfxEgg, 0.7);
      } else if (animal.produceId === "milk") {
        playSound(sfxMilk, 0.7);
      }

      return slots;
    });
  }

  // quests
  function handleClaimQuest(quest) {
    if (!quest) return;
    if (claimedQuests[quest.id]) return;
    const current = stats[quest.statKey] ?? 0;
    if (current < quest.target) return;
    setArcCoins((c) => c + quest.reward);
    setClaimedQuests((prev) => ({ ...prev, [quest.id]: true }));
    playSound(sfxQuest, 0.9);
  }

  const xpProgressPercent =
    nextLevelXp > 0 ? Math.min(100, Math.floor((xp / nextLevelXp) * 100)) : 0;

  // 👉 SE NÃO TEM CARTEIRA CONECTADA, MOSTRA A TELA DE LOADING
  if (!walletAddress) {
    return (
      <div className={"page-bg time-" + timeOfDay}>
        <SkyDecor timeOfDay={timeOfDay} />
        <WeatherOverlay weather={weather} />
        <LoadingScreen onConnect={connectWallet} />
      </div>
    );
  }

  // 👉 DEPOIS DE CONECTAR, MOSTRA O JOGO NORMAL
  return (
    <div className={"page-bg time-" + timeOfDay}>
      <SkyDecor timeOfDay={timeOfDay} />
      <WeatherOverlay weather={weather} />
      <div className="app-root">
        <header className="top-bar">
          <div className="brand">
            <div className="brand-title">ArcFarmia</div>
            <div className="brand-sub">
              Daily quests · Arc coins · crops & barn
            </div>
          </div>
          <div className="stats">
            <div className="coins">Arc coins: {arcCoins}</div>
            <div className="level-xp">
              <div className="level-line">Lv {level}</div>
              <div className="xp-bar">
                <div
                  className="xp-bar-fill"
                  style={{ width: xpProgressPercent + "%" }}
                />
              </div>
              <div className="xp-small">
                {xp}/{nextLevelXp} XP
              </div>
            </div>
            <button
              className={"backpack-btn" + (showInventory ? " open" : "")}
              onClick={() => setShowInventory((v) => !v)}
              title="Open inventory"
            >
              <img src={backpackImg} alt="Backpack inventory" />
            </button>
          </div>
        </header>

        <main className="layout">
          <section className="left">
            <div className="npc-row">
              <NpcCard
                img={samImg}
                name="Sam"
                text={`${greeting}! Welcome to ArcFarmia 🌾`}
              />
              <NpcCard
                img={timImg}
                name="Tim"
                text={`Good morning / Good Afternoon! Don't forget to water 💧`}
              />
            </div>

            <div className="field-card">
              <div className="field-header">
                <div>
                  <span>Field</span>
                  <span className="field-sub">
                    {GRID_COLS} × {GRID_ROWS} plots · plant → water → harvest
                  </span>
                </div>
                <div className="mode-switch">
                  <button
                    className={mode === "plant" ? "active" : ""}
                    onClick={() => setMode("plant")}
                  >
                    🌱 Plant
                  </button>
                  <button
                    className={mode === "water" ? "active" : ""}
                    onClick={() => setMode("water")}
                  >
                    💧 Water
                  </button>
                  <button
                    className={mode === "harvest" ? "active" : ""}
                    onClick={() => setMode("harvest")}
                  >
                    🧺 Harvest
                  </button>
                </div>
              </div>

              <CropSelector
                crops={CROPS}
                selectedCropId={selectedCropId}
                onSelect={setSelectedCropId}
              />

              <div className="field-fence">
                <div className="fence-horizontal top" />
                <div className="fence-horizontal bottom" />
                <div className="grid">
                  {field.map((tile, i) => (
                    <Tile
                      key={i}
                      tile={tile}
                      isPlayer={i === playerIndex}
                      crop={tile.cropId ? cropsById[tile.cropId] : null}
                      now={now}
                      effects={effects.filter((fx) => fx.tileIndex === i)}
                      onClick={() => handleTileClick(i)}
                    />
                  ))}
                </div>
              </div>

              <div className="hint">
                1) Plant · 2) Water · 3) Waiting timer · 4) Harvest & sell in shop
                for Arc Coins.
              </div>
            </div>
          </section>

          <section className="right">
            <QuestPanel
              quests={DAILY_QUESTS}
              stats={stats}
              claimedQuests={claimedQuests}
              onClaim={handleClaimQuest}
            />
            <ShopPanel
              crops={CROPS}
              arcCoins={arcCoins}
              harvest={harvest}
              produce={produce}
              livestockProducts={LIVESTOCK_PRODUCTS}
              onBuySeed={buySeed}
              onBuySeedPack={buySeedPack}
              onClaimDailySeeds={claimDailySeedsOnChain}
              onSellHarvest={sellHarvest}
              onSellProduce={sellProduce}
              walletAddress={walletAddress}
              onConnectWallet={connectWallet}
              onDisconnectWallet={disconnectWallet}
              onSaveOnChain={saveProgressOnChain}
            />

            <BarnPanel
              barnSlots={barnSlots}
              animalsById={animalsById}
              now={now}
              arcCoins={arcCoins}
              produce={produce}
              onBuyAnimal={handleBuyAnimal}
              onCollectProduce={handleCollectProduce}
            />
          </section>
        </main>

        <footer className="bottom">
          ArcFarmia · browser prototype for the Arc network · by kAos
        </footer>

        {showInventory && (
          <InventoryModal
            crops={CROPS}
            seeds={seeds}
            harvest={harvest}
            produce={produce}
            arcCoins={arcCoins}
            onClose={() => setShowInventory(false)}
          />
        )}
      </div>
      {levelUpMessage && (
        <div className="levelup-overlay">
          <div className="levelup-card">
            <div className="levelup-title">Congrats!</div>
            <div className="levelup-level">
              You advanced to level {levelUpMessage.level}!
            </div>
            <div className="levelup-sub">
              Keep farming to reach the next level 🔼
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ tile, crop, isPlayer, now, effects, onClick }) {
  let emoji = "▫️";
  let statusText = "";

  if (tile.state === "planted") {
    emoji = "💧";
    statusText = "Water me";
  } else if (tile.state === "growing") {
    emoji = crop?.emojiSeed ?? "🌱";
    if (crop && tile.plantedAt) {
      const total = crop.growTime;
      const elapsed = now - tile.plantedAt;
      const left = Math.max(0, total - elapsed);
      const seconds = Math.ceil(left / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      statusText =
        m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
    }
  } else if (tile.state === "ready") {
    emoji = crop?.emojiReady ?? "🌾";
    statusText = "Ready";
  }

  const hasFx = effects && effects.length > 0;

  return (
    <button
      className={
        "tile " +
        tile.state +
        (isPlayer ? " player-here" : "") +
        (tile.state === "ready" ? " tile-ready-anim" : "")
      }
      onClick={onClick}
    >
      <span className="tile-emoji">{emoji}</span>
      {statusText && <span className="tile-status">{statusText}</span>}
      {isPlayer && <span className="player-dot">👨‍🌾</span>}
      {hasFx && (
        <div className="fx-layer">
          {effects.map((fx) => {
            let symbol = "✨";
            if (fx.type === "plant") symbol = "👨‍🌾";
            else if (fx.type === "water") symbol = "🚿";
            else if (fx.type === "harvest") symbol = "🧺";
            return (
              <span key={fx.id} className={"fx fx-" + fx.type}>
                {symbol}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

function NpcCard({ img, name, text }) {
  if (!img) {
    return (
      <div className="npc-card fallback">
        <div className="npc-name">{name}</div>
        <div className="npc-text">{text}</div>
      </div>
    );
  }
  return (
    <div className="npc-card">
      <div className="npc-avatar-wrap">
        <img src={img} alt={name} />
      </div>
      <div className="npc-bubble">
        <div className="npc-name">{name}</div>
        <div className="npc-text">{text}</div>
      </div>
    </div>
  );
}

function CropSelector({ crops, selectedCropId, onSelect }) {
  return (
    <div className="crop-selector">
      {crops.map((crop) => (
        <button
          key={crop.id}
          className={
            "crop-btn" + (crop.id === selectedCropId ? " active" : "")
          }
          onClick={() => onSelect(crop.id)}
        >
          <span className="crop-emoji">{crop.emojiReady}</span>
          <span className="crop-name">{crop.name}</span>
        </button>
      ))}
    </div>
  );
}

function ShopPanel({
  crops,
  arcCoins,
  harvest,
  produce,
  livestockProducts,
  onBuySeed,
  onBuySeedPack,
  onClaimDailySeeds,
  onSellHarvest,
  onSellProduce,
  walletAddress,
  onConnectWallet,
  onDisconnectWallet,
  onSaveOnChain,
}) {
  return (
    <div className="panel shop">
      <h3>Farm Shop</h3>
      <div className="shop-coins">Arc coins: {arcCoins}</div>

      <div style={{ marginBottom: 8 }}>
        {walletAddress ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>
              Wallet:{" "}
              {walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4)}
            </span>
            <button onClick={onDisconnectWallet}>Disconnect</button>
            <button onClick={onClaimDailySeeds}>
              Claim daily seeds (on-chain)
            </button>
            <button onClick={onSaveOnChain}>💾 Save to blockchain</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onConnectWallet}>Connect wallet</button>
            <button onClick={onClaimDailySeeds} disabled>
              Claim daily seeds (on-chain)
            </button>
            <button onClick={onSaveOnChain} disabled>
              💾 Save to blockchain
            </button>
          </div>
        )}
      </div>

      <div className="shop-section">
        <div className="shop-title">Buy seeds</div>
        {crops.map((c) => (
          <div key={c.id} className="shop-row">
            <span>
              {c.emojiSeed} {c.name}
            </span>
            <span className="shop-price">{c.buyPrice} AC</span>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onBuySeed(c.id)}>Buy 1</button>
              <button onClick={() => onBuySeedPack(c.id)}>Buy x10</button>
            </div>
          </div>
        ))}
      </div>

      <div className="shop-section">
        <div className="shop-title">Sell crops</div>
        {crops.map((c) => {
          const amount = getHarvestCount(harvest, c.id);
          const disabled = amount <= 0;
          return (
            <div key={c.id} className="shop-row">
              <span>
                {c.emojiReady} {c.name} x{amount}
              </span>
              <span className="shop-price">{c.sellPrice} AC each</span>
              <button disabled={disabled} onClick={() => onSellHarvest(c.id)}>
                Sell all
              </button>
            </div>
          );
        })}
      </div>

      <div className="shop-section">
        <div className="shop-title">Sell barn products</div>
        {livestockProducts.map((p) => {
          const amount = produce[p.id] ?? 0;
          const disabled = amount <= 0;
          return (
            <div key={p.id} className="shop-row">
              <span>
                {p.emoji} {p.name} x{amount}
              </span>
              <span className="shop-price">{p.sellPrice} AC each</span>
              <button disabled={disabled} onClick={() => onSellProduce(p.id)}>
                Sell all
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InventoryModal({ crops, seeds, harvest, produce, arcCoins, onClose }) {
  return (
    <div className="inventory-backdrop" onClick={onClose}>
      <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inventory-header">
          <span>Backpack</span>
          <button className="inventory-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="inventory-sub">Arc coins: {arcCoins}</div>
        <div className="inventory-section">
          <div className="inventory-title">Seeds</div>
          <div className="inventory-grid">
            {crops.map((c) => (
              <InventorySlot
                key={"seed-" + c.id}
                label={c.name}
                emoji={c.emojiSeed}
                count={getSeedCount(seeds, c.id)}
              />
            ))}
          </div>
        </div>
        <div className="inventory-section">
          <div className="inventory-title">Crops</div>
          <div className="inventory-grid">
            {crops.map((c) => (
              <InventorySlot
                key={"harvest-" + c.id}
                label={c.name}
                emoji={c.emojiReady}
                count={getHarvestCount(harvest, c.id)}
              />
            ))}
          </div>
        </div>
        <div className="inventory-section">
          <div className="inventory-title">Barn products</div>
          <div className="inventory-grid">
            <InventorySlot label="Egg" emoji="🥚" count={produce.egg ?? 0} />
            <InventorySlot label="Milk" emoji="🥛" count={produce.milk ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InventorySlot({ label, emoji, count }) {
  return (
    <div className="inv-slot">
      <div className="inv-slot-inner">
        <span className="inv-slot-emoji">{emoji}</span>
        {count > 0 && <span className="inv-slot-count">{count}</span>}
      </div>
      <div className="inv-slot-label">{label}</div>
    </div>
  );
}

function QuestPanel({ quests, stats, claimedQuests, onClaim }) {
  return (
    <div className="panel quests">
      <h3>Daily quests</h3>
      {quests.map((q) => {
        const current = stats[q.statKey] ?? 0;
        const pct = Math.min(100, Math.floor((current / q.target) * 100));
        const completed = current >= q.target;
        const claimed = !!claimedQuests[q.id];
        return (
          <div key={q.id} className="quest-row">
            <div className="quest-main">
              <div className="quest-label">{q.label}</div>
              <div className="quest-progress">
                <div className="quest-bar">
                  <div
                    className="quest-bar-fill"
                    style={{ width: pct + "%" }}
                  />
                </div>
                <span className="quest-count">
                  {Math.min(current, q.target)}/{q.target}
                </span>
              </div>
            </div>
            <div className="quest-side">
              <div className="quest-reward">{q.reward} AC</div>
              <button
                disabled={!completed || claimed}
                onClick={() => onClaim(q)}
              >
                {claimed ? "Claimed" : "Claim"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarnPanel({
  barnSlots,
  animalsById,
  now,
  arcCoins,
  produce,
  onBuyAnimal,
  onCollectProduce,
}) {
  return (
    <div className="panel barn">
      <h3>Barn</h3>
      <div className="barn-sub">6 plots · chickens & cows</div>
      <div className="barn-layout">
        <div className="barn-building">
          <div className="barn-roof" />
          <div className="barn-body">
            <div className="barn-window" />
            <div className="barn-door" />
          </div>
        </div>
        <div className="barn-grid">
          {barnSlots.map((slot, index) => (
            <BarnSlot
              key={index}
              index={index}
              slot={slot}
              animalsById={animalsById}
              now={now}
              arcCoins={arcCoins}
              onBuyAnimal={onBuyAnimal}
              onCollectProduce={onCollectProduce}
            />
          ))}
        </div>
      </div>
      <div className="barn-footer">
        <span>🥚 Eggs: {produce.egg ?? 0}</span>
        <span>🥛 Milk: {produce.milk ?? 0}</span>
      </div>
    </div>
  );
}

function BarnSlot({
  index,
  slot,
  animalsById,
  now,
  arcCoins,
  onBuyAnimal,
  onCollectProduce,
}) {
  const [collectFx, setCollectFx] = useState(null);

  const chicken = animalsById["chicken"];
  const cow = animalsById["cow"];

  if (!slot.animalId) {
    return (
      <div className="barn-slot empty">
        <div className="barn-slot-label">Empty</div>
        <button
          className="barn-buy"
          disabled={!chicken || arcCoins < chicken.buyPrice}
          onClick={() => onBuyAnimal(index, "chicken")}
        >
          🐔 {chicken ? chicken.buyPrice : "--"} AC
        </button>
        <button
          className="barn-buy"
          disabled={!cow || arcCoins < cow.buyPrice}
          onClick={() => onBuyAnimal(index, "cow")}
        >
          🐄 {cow ? cow.buyPrice : "--"} AC
        </button>
      </div>
    );
  }

  const animal = animalsById[slot.animalId];
  if (!animal) {
    return (
      <div className="barn-slot empty">
        <div className="barn-slot-label">Empty</div>
      </div>
    );
  }

  const baseTime = slot.lastCollectedAt || slot.startedAt;
  let leftMs = animal.produceTime;
  if (baseTime) {
    const elapsed = now - baseTime;
    leftMs = Math.max(0, animal.produceTime - elapsed);
  }
  const ready = leftMs <= 0;
  const seconds = Math.ceil(leftMs / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const timerLabel =
    ready ? "Ready!" : m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;

  function handleCollectClick() {
    if (!ready) return;
    setCollectFx(animal.produceId);
    setTimeout(() => setCollectFx(null), 600);
    onCollectProduce(index);
  }

  return (
    <div className={"barn-slot" + (ready ? " ready" : "")}>
      <div className="barn-slot-header">
        <span className="barn-emoji">{animal.emoji}</span>
        <span className="barn-name">{animal.name}</span>
      </div>
      <div className="barn-timer">{timerLabel}</div>
      <button
        className="barn-collect"
        disabled={!ready}
        onClick={handleCollectClick}
      >
        Collect {animal.produceEmoji}
      </button>
      {ready && animal.produceId === "egg" && (
        <div className="barn-laying">🥚</div>
      )}
      {ready && animal.produceId === "milk" && (
        <div className="barn-laying milk">🥛</div>
      )}
      {collectFx && (
        <div className="barn-collect-fx">
          <span className="barn-farmer">👨‍🌾</span>
          {collectFx === "egg" ? (
            <span className="barn-target">🐔</span>
          ) : (
            <span className="barn-target">🐄</span>
          )}
        </div>
      )}
    </div>
  );
}

function SkyDecor({ timeOfDay }) {
  return (
    <div className="sky-decor">
      <img src={sunImg} className={"sky-sun " + timeOfDay} alt="Sun" />
      <img src={moonImg} className={"sky-moon " + timeOfDay} alt="Moon" />
      <img src={cloud1Img} className="sky-cloud cloud-1" alt="" />
      <img src={cloud2Img} className="sky-cloud cloud-2" alt="" />
      <img src={cloud3Img} className="sky-cloud cloud-3" alt="" />
      <div className="sky-birds birds-1">🐦</div>
      <div className="sky-birds birds-2">🐦🐦</div>
    </div>
  );
}

function WeatherOverlay({ weather }) {
  if (weather === "clear") return null;
  const drops = Array.from({ length: 60 });
  const puffs = Array.from({ length: 10 });
  return (
    <div className={"weather-overlay " + weather}>
      {weather === "rain" && (
        <>
          <div className="rain-drops">
            {drops.map((_, i) => (
              <span key={i} className="rain-drop" />
            ))}
          </div>
          <div className="lightning-flash" />
        </>
      )}
      {weather === "fog" && (
        <div className="fog-puffs">
          {puffs.map((_, i) => (
            <span key={i} className="fog-puff" />
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
