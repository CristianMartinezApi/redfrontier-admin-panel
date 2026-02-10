import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { auth } from "./firebase.js";
import {
  getPlayer,
  createPlayer,
  updatePlayer,
  ensureExpiredBenefits,
  listPlayers,
  getBanEntry,
  syncBanList,
  addBanEntry,
  removeBanEntry,
  listBanEntries,
} from "./playerService.js";
import {
  addFinanceEntry,
  addExpenseEntry,
  listFinanceEntries,
  listAllFinanceEntries,
  listExpenseEntries,
  listAllExpenseEntries,
  getFinanceSummary,
  getExpenseSummary,
} from "./financeService.js";
import {
  upsertNotification,
  removeNotification,
  listNotifications,
  markNotificationRead,
} from "./notificationsService.js?v=2";

const loginView = document.getElementById("loginView");
const panelView = document.getElementById("panelView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const refreshBtn = document.getElementById("refreshBtn");
const financeRefreshBtn = document.getElementById("financeRefreshBtn");
const playersListRefreshBtn = document.getElementById("playersListRefreshBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const dashboardView = document.getElementById("dashboardView");
const playersView = document.getElementById("playersView");
const financeView = document.getElementById("financeView");
const banView = document.getElementById("banView");

const searchForm = document.getElementById("searchForm");
const searchSteamId = document.getElementById("searchSteamId");
const searchResult = document.getElementById("searchResult");

const createForm = document.getElementById("createForm");
const createError = document.getElementById("createError");
const createNotice = document.getElementById("createNotice");
const createSteamId = document.getElementById("createSteamId");
const createBanido = document.getElementById("createBanido");
const playersList = document.getElementById("playersList");

const editForm = document.getElementById("editForm");
const editError = document.getElementById("editError");

const editSteamId = document.getElementById("editSteamId");
const editNick = document.getElementById("editNick");
const editNome = document.getElementById("editNome");
const editWhitelist = document.getElementById("editWhitelist");
const editBanido = document.getElementById("editBanido");

const editVipAtivo = document.getElementById("editVipAtivo");
const editVipTipo = document.getElementById("editVipTipo");
const editVipDuracao = document.getElementById("editVipDuracao");

const editSeguroAtivo = document.getElementById("editSeguroAtivo");
const editSeguroTipo = document.getElementById("editSeguroTipo");
const editSeguroFim = document.getElementById("editSeguroFim");

const financeForm = document.getElementById("financeForm");
const financeAmount = document.getElementById("financeAmount");
const financeSource = document.getElementById("financeSource");
const financeDescription = document.getElementById("financeDescription");
const financeReference = document.getElementById("financeReference");
const financeError = document.getElementById("financeError");
const financeList = document.getElementById("financeList");
const expenseForm = document.getElementById("expenseForm");
const expenseAmount = document.getElementById("expenseAmount");
const expenseCategory = document.getElementById("expenseCategory");
const expenseDescription = document.getElementById("expenseDescription");
const expenseReference = document.getElementById("expenseReference");
const expenseError = document.getElementById("expenseError");
const expenseList = document.getElementById("expenseList");
const financeTotal = document.getElementById("financeTotal");
const financeTotalGrabs = document.getElementById("financeTotalGrabs");
const financeTotalVips = document.getElementById("financeTotalVips");
const financeTotalExpenses = document.getElementById("financeTotalExpenses");
const financeExpenseCount = document.getElementById("financeExpenseCount");
const financeNet = document.getElementById("financeNet");
const financeCount = document.getElementById("financeCount");
const financeExportBtn = document.getElementById("financeExportBtn");
const financeTrendChartCanvas = document.getElementById("financeTrendChart");
const financeSourceChartCanvas = document.getElementById("financeSourceChart");
const expenseCategoryChartCanvas = document.getElementById(
  "expenseCategoryChart",
);
const benefitsChartCanvas = document.getElementById("benefitsChart");

const notifBtn = document.getElementById("notifBtn");
const notifCount = document.getElementById("notifCount");
const notifPanel = document.getElementById("notifPanel");
const notifList = document.getElementById("notifList");
const notifModal = document.getElementById("notifModal");
const notifModalTitle = document.getElementById("notifModalTitle");
const notifModalBody = document.getElementById("notifModalBody");
const notifModalClose = document.getElementById("notifModalClose");

const banForm = document.getElementById("banForm");
const banSteamId = document.getElementById("banSteamId");
const banReason = document.getElementById("banReason");
const banError = document.getElementById("banError");
const banList = document.getElementById("banList");
const banRefreshBtn = document.getElementById("banRefreshBtn");

const detailStatus = document.getElementById("detailStatus");
const detailVip = document.getElementById("detailVip");
const detailSeguro = document.getElementById("detailSeguro");
const detailCreated = document.getElementById("detailCreated");
const detailUpdated = document.getElementById("detailUpdated");
const detailLastSeen = document.getElementById("detailLastSeen");
const detailWarning = document.getElementById("detailWarning");

const playersFilter = document.getElementById("playersFilter");
const playersPageSize = document.getElementById("playersPageSize");
const playersPrevBtn = document.getElementById("playersPrevBtn");
const playersNextBtn = document.getElementById("playersNextBtn");
const playersPageInfo = document.getElementById("playersPageInfo");

let playersCache = [];
let playersFiltered = [];
let playersPage = 1;
let notificationsCleanupDone = false;
let currentPlayer = null;
let financeTrendChart = null;
let financeSourceChart = null;
let expenseCategoryChart = null;
let benefitsChart = null;
let dashboardFinanceEntries = [];
let dashboardFinanceSummary = null;
let dashboardExpenseEntries = [];
let dashboardExpenseSummary = null;

const setView = (isAuthenticated) => {
  loginView.classList.toggle("hidden", isAuthenticated);
  panelView.classList.toggle("hidden", !isAuthenticated);
};

const setActiveView = (viewName) => {
  const views = {
    dashboard: dashboardView,
    players: playersView,
    finance: financeView,
    ban: banView,
  };

  Object.entries(views).forEach(([key, view]) => {
    view.classList.toggle("active", key === viewName);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
};

const normalizeSteamId = (steamId) => steamId.trim();
const NOTIFY_DAYS = [2, 0];
const allowedEmails = [
  "victorbrizante@gmail.com",
  "joseinaldoj640@gmail.com",
  "fernandesribe04@gmail.com",
  "redfrontierserver@gmail.com",
];
const allowedDomains = [];

const isAuthorizedUser = (user) => {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  if (allowedEmails.map((value) => value.toLowerCase()).includes(email)) {
    return true;
  }
  return allowedDomains
    .map((value) => value.toLowerCase())
    .some((domain) => email.endsWith(`@${domain}`));
};

const validatePlayerForm = (data) => {
  if (!data.steamId) return "SteamID e obrigatorio.";
  if (!data.nick) return "Nick e obrigatorio.";
  if (!data.nome) return "Nome e obrigatorio.";
  return "";
};

const fillEditForm = (player) => {
  currentPlayer = player;
  editSteamId.value = player.steamId || "";
  editNick.value = player.nick || "";
  editNome.value = player.nome || "";
  editWhitelist.checked = Boolean(player.status?.whitelist);
  editBanido.checked = Boolean(player.status?.banido);

  editVipAtivo.checked = Boolean(player.vip?.ativo);
  editVipTipo.value = player.vip?.tipo || "";
  editVipDuracao.value = player.vip?.duracaoDays
    ? String(player.vip.duracaoDays)
    : "";

  editSeguroAtivo.checked = Boolean(player.seguro?.ativo);
  editSeguroTipo.value = player.seguro?.tipo || "";
  editSeguroFim.value = player.seguro?.fim
    ? player.seguro.fim.toDate().toISOString().slice(0, 10)
    : "";
};

const readEditForm = () => {
  const steamId = normalizeSteamId(editSteamId.value);
  const vipDurationDays = editVipDuracao.value
    ? Number(editVipDuracao.value)
    : null;
  const vipWasActive = Boolean(currentPlayer?.vip?.ativo);
  const vipDurationChanged =
    vipDurationDays && vipDurationDays !== currentPlayer?.vip?.duracaoDays;

  let vipInicio = currentPlayer?.vip?.inicio || null;
  let vipFim = currentPlayer?.vip?.fim || null;

  if (editVipAtivo.checked && vipDurationDays) {
    if (!vipWasActive || vipDurationChanged) {
      const now = new Date();
      vipInicio = Timestamp.fromDate(now);
      vipFim = Timestamp.fromDate(
        new Date(now.getTime() + vipDurationDays * 24 * 60 * 60 * 1000),
      );
    }
  }

  return {
    steamId,
    nick: editNick.value.trim(),
    nome: editNome.value.trim(),
    status: {
      whitelist: editWhitelist.checked,
      banido: editBanido.checked,
    },
    vip: {
      ativo: editVipAtivo.checked,
      tipo: editVipTipo.value.trim(),
      duracaoDays: vipDurationDays,
      inicio: editVipAtivo.checked ? vipInicio : null,
      fim: editVipAtivo.checked ? vipFim : null,
    },
    seguro: {
      ativo: editSeguroAtivo.checked,
      tipo: editSeguroTipo.value.trim(),
      inicio: editSeguroAtivo.checked ? Timestamp.fromDate(new Date()) : null,
      fim: editSeguroFim.value
        ? Timestamp.fromDate(new Date(editSeguroFim.value))
        : null,
    },
  };
};

const readCreateForm = () => {
  return {
    steamId: normalizeSteamId(document.getElementById("createSteamId").value),
    nick: document.getElementById("createNick").value.trim(),
    nome: document.getElementById("createNome").value.trim(),
    status: {
      whitelist: document.getElementById("createWhitelist").checked,
      banido: document.getElementById("createBanido").checked,
    },
    vip: {
      ativo: false,
      tipo: "",
      inicio: null,
      fim: null,
    },
    seguro: {
      ativo: false,
      tipo: "",
      inicio: null,
      fim: null,
    },
  };
};

const showSearchResult = (player) => {
  if (!player) {
    searchResult.textContent = "Jogador nao encontrado.";
    return;
  }

  searchResult.textContent = `Encontrado: ${player.nick} (${player.steamId})`;
};

const timestampToDate = (timestamp) =>
  timestamp?.toDate ? timestamp.toDate() : null;

const shouldNotify = (daysLeft) =>
  daysLeft !== null && NOTIFY_DAYS.includes(daysLeft);

const daysUntil = (timestamp) => {
  const date = timestampToDate(timestamp);
  if (!date) {
    return null;
  }
  const now = new Date();
  const diff = (date - now) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(diff));
};

const formatDate = (timestamp) => {
  const date = timestampToDate(timestamp);
  return date ? date.toLocaleDateString("pt-BR") : "-";
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatCurrencyInput = (value) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const parseAmount = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }
    const cleaned = trimmed.replace(/[^\d.,-]/g, "");
    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const setupCurrencyInput = (input) => {
  if (!input) {
    return;
  }
  const formatFromDigits = (digits) => {
    const number = digits ? Number(digits) / 100 : 0;
    return number ? formatCurrencyInput(number) : "";
  };

  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "");
    input.value = formatFromDigits(digits);
    input.setSelectionRange(input.value.length, input.value.length);
  });

  input.addEventListener("blur", () => {
    const digits = input.value.replace(/\D/g, "");
    input.value = formatFromDigits(digits);
  });
};

const resolveSettled = (result, fallback) =>
  result.status === "fulfilled" ? result.value : fallback;

const getChartColors = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--text").trim() || "#e6edf3",
    muted: styles.getPropertyValue("--muted").trim() || "#98a2b3",
    line: styles.getPropertyValue("--line").trim() || "#27314f",
    accent: styles.getPropertyValue("--accent").trim() || "#ffb703",
    accent2: styles.getPropertyValue("--accent-2").trim() || "#ff7a00",
    success: styles.getPropertyValue("--success").trim() || "#12b981",
    danger: styles.getPropertyValue("--danger").trim() || "#f97066",
  };
};

const getEntryDate = (entry) =>
  entry?.createdAt?.toDate ? entry.createdAt.toDate() : null;

const buildMonthBuckets = (monthsCount) => {
  const buckets = [];
  const now = new Date();
  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("pt-BR", { month: "short" });
    buckets.push({
      key,
      label: `${label.replace(".", "")}/${String(date.getFullYear()).slice(-2)}`,
      total: 0,
    });
  }
  return buckets;
};

const updateFinanceTrendChart = (entries, expenses) => {
  if (!financeTrendChartCanvas || !window.Chart) {
    return;
  }
  const colors = getChartColors();
  const buckets = buildMonthBuckets(6);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const expenseTotals = buckets.map(() => 0);

  entries.forEach((entry) => {
    const date = getEntryDate(entry);
    if (!date) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.total += parseAmount(entry.amount);
    }
  });

  expenses.forEach((entry) => {
    const date = getEntryDate(entry);
    if (!date) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const index = buckets.findIndex((bucket) => bucket.key === key);
    if (index >= 0) {
      expenseTotals[index] += parseAmount(entry.amount);
    }
  });

  const data = {
    labels: buckets.map((bucket) => bucket.label),
    datasets: [
      {
        label: "Entradas",
        data: buckets.map((bucket) => bucket.total),
        borderColor: colors.accent,
        backgroundColor: "rgba(255, 183, 3, 0.2)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
      {
        label: "Saidas",
        data: expenseTotals,
        borderColor: colors.danger,
        backgroundColor: "rgba(249, 112, 102, 0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: colors.muted },
        grid: { color: "rgba(39, 49, 79, 0.4)" },
      },
      y: {
        ticks: {
          color: colors.muted,
          callback: (value) => formatCurrency(value),
        },
        grid: { color: "rgba(39, 49, 79, 0.4)" },
      },
    },
  };

  if (financeTrendChart) {
    financeTrendChart.data = data;
    financeTrendChart.options = options;
    financeTrendChart.update();
  } else {
    financeTrendChart = new window.Chart(financeTrendChartCanvas, {
      type: "line",
      data,
      options,
    });
  }
};

const updateFinanceSourceChart = (summary) => {
  if (!financeSourceChartCanvas || !window.Chart || !summary) {
    return;
  }
  const colors = getChartColors();
  const totals = summary.totalsBySource || {};
  const labels = Object.keys(totals);
  const values = labels.map((label) => Number(totals[label] || 0));

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [colors.accent, colors.accent2, colors.success],
        borderColor: colors.line,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: colors.text,
        },
      },
    },
  };

  if (financeSourceChart) {
    financeSourceChart.data = data;
    financeSourceChart.options = options;
    financeSourceChart.update();
  } else {
    financeSourceChart = new window.Chart(financeSourceChartCanvas, {
      type: "doughnut",
      data,
      options,
    });
  }
};

const updateExpenseCategoryChart = (summary) => {
  if (!expenseCategoryChartCanvas || !window.Chart || !summary) {
    return;
  }
  const colors = getChartColors();
  const totals = summary.totalsByCategory || {};
  const labels = Object.keys(totals);
  const values = labels.map((label) => Number(totals[label] || 0));

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [colors.danger, colors.accent2, colors.muted],
        borderColor: colors.line,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: colors.text,
        },
      },
    },
  };

  if (expenseCategoryChart) {
    expenseCategoryChart.data = data;
    expenseCategoryChart.options = options;
    expenseCategoryChart.update();
  } else {
    expenseCategoryChart = new window.Chart(expenseCategoryChartCanvas, {
      type: "doughnut",
      data,
      options,
    });
  }
};

const updateBenefitsChart = (players) => {
  if (!benefitsChartCanvas || !window.Chart || !players?.length) {
    return;
  }
  const colors = getChartColors();
  const vipCount = players.filter((player) => player.vip?.ativo).length;
  const seguroCount = players.filter((player) => player.seguro?.ativo).length;
  const banCount = players.filter((player) => player.status?.banido).length;

  const data = {
    labels: ["VIP ativo", "Seguro ativo", "Banidos"],
    datasets: [
      {
        data: [vipCount, seguroCount, banCount],
        backgroundColor: [colors.accent, colors.success, colors.danger],
        borderColor: colors.line,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: { color: colors.muted },
        grid: { color: "rgba(39, 49, 79, 0.4)" },
      },
      y: {
        ticks: { color: colors.muted, precision: 0 },
        grid: { color: "rgba(39, 49, 79, 0.4)" },
        beginAtZero: true,
      },
    },
  };

  if (benefitsChart) {
    benefitsChart.data = data;
    benefitsChart.options = options;
    benefitsChart.update();
  } else {
    benefitsChart = new window.Chart(benefitsChartCanvas, {
      type: "bar",
      data,
      options,
    });
  }
};

const updateDashboardCharts = () => {
  updateFinanceTrendChart(dashboardFinanceEntries, dashboardExpenseEntries);
  updateFinanceSourceChart(dashboardFinanceSummary);
  updateExpenseCategoryChart(dashboardExpenseSummary);
  updateBenefitsChart(playersCache);
};

const buildCsv = (rows) => {
  const escapeValue = (value) => {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  };

  return rows.map((row) => row.map(escapeValue).join(",")).join("\n");
};

const renderFinanceList = (entries) => {
  if (!entries.length) {
    financeList.textContent = "Nenhuma entrada registrada.";
    return;
  }

  financeList.innerHTML = entries
    .map((entry) => {
      const dateText = entry.createdAt?.toDate
        ? entry.createdAt.toDate().toLocaleDateString("pt-BR")
        : "-";
      const reference = entry.reference ? ` • ${entry.reference}` : "";
      const source = entry.source ? ` • ${entry.source}` : "";
      return `
        <div class="finance-item">
          <div>
            <div>${entry.description}</div>
            <div class="finance-meta">${dateText}${source}${reference}</div>
          </div>
          <div>${formatCurrency(parseAmount(entry.amount))}</div>
        </div>
      `;
    })
    .join("");
};

const renderExpenseList = (entries) => {
  if (!entries.length) {
    expenseList.textContent = "Nenhuma saida registrada.";
    return;
  }

  expenseList.innerHTML = entries
    .map((entry) => {
      const dateText = entry.createdAt?.toDate
        ? entry.createdAt.toDate().toLocaleDateString("pt-BR")
        : "-";
      const reference = entry.reference ? ` • ${entry.reference}` : "";
      const category = entry.category ? ` • ${entry.category}` : "";
      return `
        <div class="finance-item">
          <div>
            <div>${entry.description}</div>
            <div class="finance-meta">${dateText}${category}${reference}</div>
          </div>
          <div>${formatCurrency(parseAmount(entry.amount))}</div>
        </div>
      `;
    })
    .join("");
};

const renderBanList = (entries) => {
  if (!entries.length) {
    banList.textContent = "Nenhum banimento cadastrado.";
    return;
  }

  banList.innerHTML = entries
    .map((entry) => {
      const updatedText = formatDate(entry.updatedAt);
      const reasonText = entry.reason ? ` • ${entry.reason}` : "";
      return `
        <div class="ban-item" data-steamid="${entry.steamId}">
          <div>
            <div>${entry.steamId}</div>
            <div class="player-meta">${updatedText}${reasonText}</div>
          </div>
          <div class="ban-actions">
            <button class="btn btn-ghost" data-action="remove">Remover</button>
          </div>
        </div>
      `;
    })
    .join("");
};

const renderPlayersList = (players) => {
  if (!players.length) {
    playersList.textContent = "Nenhum jogador cadastrado.";
    return;
  }

  playersList.innerHTML = players
    .map((player) => {
      const createdText = formatDate(player.createdAt);
      const vipDaysLeft = daysUntil(player.vip?.fim);
      const seguroDaysLeft = daysUntil(player.seguro?.fim);
      const vipWarn = player.vip?.ativo && shouldNotify(vipDaysLeft);
      const seguroWarn = player.seguro?.ativo && shouldNotify(seguroDaysLeft);
      const warningText = vipWarn || seguroWarn ? "Proximo vencimento" : "";
      return `
        <div class="player-item" data-steamid="${player.steamId}">
          <div>
            <div>${player.nick || "Sem nick"}</div>
            <div class="player-meta">${player.steamId} • ${createdText} ${warningText ? "• " + warningText : ""}</div>
          </div>
          <div>${player.status?.banido ? "Banido" : "Ativo"}</div>
        </div>
      `;
    })
    .join("");
};

const renderPlayerDetails = (player) => {
  if (!player) {
    detailStatus.textContent = "-";
    detailVip.textContent = "-";
    detailSeguro.textContent = "-";
    detailCreated.textContent = "-";
    detailUpdated.textContent = "-";
    detailLastSeen.textContent = "-";
    detailWarning.textContent = "";
    return;
  }

  detailStatus.textContent = player.status?.banido ? "Banido" : "Ativo";
  detailVip.textContent = player.vip?.ativo
    ? `${player.vip.tipo || "VIP"} (${player.vip.duracaoDays || "-"} dias) fim ${formatDate(player.vip.fim)}`
    : "Nao ativo";
  detailSeguro.textContent = player.seguro?.ativo
    ? `${player.seguro.tipo || "Seguro"} (fim ${formatDate(player.seguro.fim)})`
    : "Nao ativo";
  detailCreated.textContent = formatDate(player.createdAt);
  detailUpdated.textContent = formatDate(player.updatedAt);
  detailLastSeen.textContent = formatDate(player.lastSeenAt);

  const warnings = [];
  const vipDaysLeft = daysUntil(player.vip?.fim);
  const seguroDaysLeft = daysUntil(player.seguro?.fim);
  if (player.vip?.ativo && shouldNotify(vipDaysLeft)) {
    warnings.push(vipDaysLeft === 0 ? "VIP vence hoje" : "VIP vence em 2 dias");
  }
  if (player.seguro?.ativo && shouldNotify(seguroDaysLeft)) {
    warnings.push(
      seguroDaysLeft === 0 ? "Seguro vence hoje" : "Seguro vence em 2 dias",
    );
  }
  detailWarning.textContent = warnings.join(" | ");
};

const renderNotifications = (entries) => {
  if (!entries.length) {
    notifList.textContent = "Nenhuma notificacao.";
    notifCount.textContent = "0";
    return;
  }

  const unreadCount = entries.filter((entry) => !entry.read).length;
  notifCount.textContent = String(unreadCount);

  notifList.innerHTML = entries
    .map((entry) => {
      const dateText = formatDate(entry.updatedAt);
      const unreadClass = entry.read ? "" : "unread";
      return `
        <div
          class="notif-item ${unreadClass}"
          data-id="${entry.id}"
          data-type="${entry.type || ""}"
          data-steamid="${entry.steamId || ""}"
          data-nick="${entry.nick || ""}"
          data-viptipo="${entry.vipTipo || ""}"
          data-segurotipo="${entry.seguroTipo || ""}"
          data-expires="${entry.expiresAt?.toDate ? entry.expiresAt.toDate().toISOString() : ""}"
          data-daysleft="${entry.daysLeft ?? ""}"
          data-message="${entry.message || ""}"
        >
          <div>${entry.message}</div>
          <div class="player-meta">${dateText}</div>
        </div>
      `;
    })
    .join("");
};

const openNotifModal = (data) => {
  notifModalTitle.textContent = "Notificacao";
  const lines = [];
  if (data.message) lines.push(`<div>${data.message}</div>`);
  if (data.nick || data.steamId) {
    lines.push(
      `<div><strong>Jogador:</strong> ${data.nick ? data.nick + " (" + data.steamId + ")" : data.steamId}</div>`,
    );
  }
  if (data.type === "vip") {
    lines.push(`<div><strong>Tipo VIP:</strong> ${data.vipTipo || "-"}</div>`);
  }
  if (data.type === "seguro") {
    lines.push(
      `<div><strong>Tipo Seguro:</strong> ${data.seguroTipo || "-"}</div>`,
    );
  }
  if (data.expires) {
    const dateText = new Date(data.expires).toLocaleDateString("pt-BR");
    lines.push(`<div><strong>Vencimento:</strong> ${dateText}</div>`);
  }
  if (data.daysLeft) {
    lines.push(`<div><strong>Dias restantes:</strong> ${data.daysLeft}</div>`);
  }
  notifModalBody.innerHTML = lines.join("");
  notifModal.classList.remove("hidden");
};

const refreshNotifications = async () => {
  const entries = await listNotifications(50);
  renderNotifications(entries);
};

const cleanupTestNotifications = async () => {
  if (notificationsCleanupDone) {
    return;
  }
  notificationsCleanupDone = true;
  const entries = await listNotifications(200);
  const deletions = entries
    .filter(
      (entry) =>
        entry.id?.startsWith("vip-teste-") ||
        entry.id?.startsWith("teste-") ||
        entry.message?.includes("Jogador Teste") ||
        entry.message?.includes("Notificacao de teste"),
    )
    .map((entry) => removeNotification(entry.id));
  await Promise.all(deletions);
};

const syncExpiringNotifications = async (players) => {
  const tasks = [];
  players.forEach((player) => {
    const steamId = player.steamId;
    if (!steamId) {
      return;
    }
    const vipId = `vip-${steamId}`;
    const seguroId = `seguro-${steamId}`;
    const displayName = player.nick ? `${player.nick} (${steamId})` : steamId;

    const vipDaysLeft = daysUntil(player.vip?.fim);
    if (player.vip?.ativo && shouldNotify(vipDaysLeft)) {
      const vipType = player.vip?.tipo || "VIP";
      const vipDuration = player.vip?.duracaoDays || null;
      tasks.push(
        upsertNotification(vipId, {
          type: "vip",
          steamId,
          nick: player.nick || "",
          vipTipo: vipType,
          vipDuracaoDays: vipDuration,
          expiresAt: player.vip?.fim || null,
          daysLeft: vipDaysLeft,
          message:
            vipDaysLeft === 0
              ? `VIP ${vipType} de ${displayName} vence hoje`
              : `VIP ${vipType} de ${displayName} vence em ${formatDate(player.vip?.fim)} (2 dias)`,
          read: false,
        }),
      );
    } else {
      tasks.push(removeNotification(vipId));
    }

    const seguroDaysLeft = daysUntil(player.seguro?.fim);
    if (player.seguro?.ativo && shouldNotify(seguroDaysLeft)) {
      const seguroType = player.seguro?.tipo || "Seguro";
      tasks.push(
        upsertNotification(seguroId, {
          type: "seguro",
          steamId,
          nick: player.nick || "",
          seguroTipo: seguroType,
          expiresAt: player.seguro?.fim || null,
          daysLeft: seguroDaysLeft,
          message:
            seguroDaysLeft === 0
              ? `Seguro ${seguroType} de ${displayName} vence hoje`
              : `Seguro ${seguroType} de ${displayName} vence em ${formatDate(player.seguro?.fim)} (2 dias)`,
          read: false,
        }),
      );
    } else {
      tasks.push(removeNotification(seguroId));
    }
  });

  await Promise.all(tasks);
  await refreshNotifications();
};

const updatePlayersPagination = () => {
  const pageSize = Number(playersPageSize.value) || 20;
  const totalPages = Math.max(1, Math.ceil(playersFiltered.length / pageSize));
  if (playersPage > totalPages) {
    playersPage = totalPages;
  }
  const startIndex = (playersPage - 1) * pageSize;
  const pageItems = playersFiltered.slice(startIndex, startIndex + pageSize);
  renderPlayersList(pageItems);
  playersPageInfo.textContent = `Pagina ${playersPage} de ${totalPages}`;
  playersPrevBtn.disabled = playersPage <= 1;
  playersNextBtn.disabled = playersPage >= totalPages;
};

const applyPlayersFilter = () => {
  const term = playersFilter.value.trim().toLowerCase();
  if (!term) {
    playersFiltered = [...playersCache];
  } else {
    playersFiltered = playersCache.filter((player) => {
      const nick = (player.nick || "").toLowerCase();
      const steamId = (player.steamId || "").toLowerCase();
      return nick.includes(term) || steamId.includes(term);
    });
  }
  playersPage = 1;
  updatePlayersPagination();
};

const refreshPlayersList = async () => {
  const players = await listPlayers(200);
  playersCache = players;
  applyPlayersFilter();
  await syncExpiringNotifications(players);
  updateDashboardCharts();
};

const refreshFinanceData = async () => {
  const results = await Promise.allSettled([
    listFinanceEntries(10),
    getFinanceSummary(),
    listAllFinanceEntries(),
    listExpenseEntries(10),
    getExpenseSummary(),
    listAllExpenseEntries(),
  ]);
  const entries = resolveSettled(results[0], []);
  const summary = resolveSettled(results[1], {
    total: 0,
    count: 0,
    totalsBySource: {
      "loja GRABS": 0,
      VIPs: 0,
    },
  });
  const allEntries = resolveSettled(results[2], []);
  const expenseEntries = resolveSettled(results[3], []);
  const expenseSummary = resolveSettled(results[4], {
    total: 0,
    count: 0,
    totalsByCategory: {},
  });
  const allExpenseEntries = resolveSettled(results[5], []);
  renderFinanceList(entries);
  if (results[3].status === "rejected") {
    expenseList.textContent = "Nao foi possivel carregar as saidas.";
  } else {
    renderExpenseList(expenseEntries);
  }
  financeTotal.textContent = formatCurrency(summary.total || 0);
  financeTotalGrabs.textContent = formatCurrency(
    summary.totalsBySource?.["loja GRABS"] || 0,
  );
  financeTotalVips.textContent = formatCurrency(
    summary.totalsBySource?.VIPs || 0,
  );
  financeCount.textContent = `${summary.count} entradas`;
  financeTotalExpenses.textContent = formatCurrency(expenseSummary.total || 0);
  financeExpenseCount.textContent = `${expenseSummary.count} saidas`;
  financeNet.textContent = formatCurrency(
    (summary.total || 0) - (expenseSummary.total || 0),
  );
  dashboardFinanceEntries = allEntries;
  dashboardFinanceSummary = summary;
  dashboardExpenseEntries = allExpenseEntries;
  dashboardExpenseSummary = expenseSummary;
  updateDashboardCharts();
};

const refreshBanList = async () => {
  const entries = await listBanEntries(100);
  renderBanList(entries);
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = "Falha no login. Verifique seus dados.";
  }
});

googleLoginBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (redirectError) {
      loginError.textContent = "Falha no login com Google.";
    }
  }
});

const handleGoogleRedirect = async () => {
  try {
    await getRedirectResult(auth);
  } catch (error) {
    loginError.textContent = "Falha no retorno do login com Google.";
  }
};

handleGoogleRedirect();

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  const isAuthenticated = Boolean(user);
  setView(isAuthenticated);
  userEmail.textContent = user?.email || "Desconectado";
  if (isAuthenticated) {
    if (!isAuthorizedUser(user)) {
      loginError.textContent = "Acesso nao autorizado para esta conta.";
      await signOut(auth);
      setView(false);
      userEmail.textContent = "Desconectado";
      return;
    }
    setActiveView("players");
    refreshPlayersList();
    refreshFinanceData();
    refreshBanList();
    await cleanupTestNotifications();
    refreshNotifications();
  }
});

createSteamId.addEventListener("blur", async () => {
  const steamId = normalizeSteamId(createSteamId.value);
  if (!steamId) {
    createNotice.textContent = "";
    return;
  }
  const banEntry = await getBanEntry(steamId);
  if (banEntry) {
    createBanido.checked = true;
    createNotice.textContent = "Jogador consta na lista de banidos.";
  } else {
    createNotice.textContent = "";
  }
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

playersFilter.addEventListener("input", () => {
  applyPlayersFilter();
});

playersPageSize.addEventListener("change", () => {
  playersPage = 1;
  updatePlayersPagination();
});

playersPrevBtn.addEventListener("click", () => {
  if (playersPage > 1) {
    playersPage -= 1;
    updatePlayersPagination();
  }
});

playersNextBtn.addEventListener("click", () => {
  playersPage += 1;
  updatePlayersPagination();
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  searchResult.textContent = "";

  const steamId = normalizeSteamId(searchSteamId.value);
  if (!steamId) {
    searchResult.textContent = "Informe o SteamID.";
    return;
  }

  const player = await getPlayer(steamId);
  if (player) {
    await ensureExpiredBenefits(player);
    fillEditForm(player);
  }

  showSearchResult(player);
});

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  createError.textContent = "";

  const data = readCreateForm();
  const validation = validatePlayerForm(data);
  if (validation) {
    createError.textContent = validation;
    return;
  }

  const existing = await getPlayer(data.steamId);
  if (existing) {
    createError.textContent = "SteamID ja cadastrado.";
    return;
  }

  try {
    await createPlayer(data);
    await syncBanList(data.steamId, data.status?.banido);
    createForm.reset();
    createNotice.textContent = "";
    await refreshPlayersList();
  } catch (error) {
    createError.textContent = "Erro ao cadastrar jogador.";
  }
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  editError.textContent = "";

  if (!editSteamId.value.trim()) {
    editError.textContent = "Busque um jogador primeiro.";
    return;
  }

  const data = readEditForm();
  const validation = validatePlayerForm(data);
  if (validation) {
    editError.textContent = validation;
    return;
  }

  if (data.vip.ativo && !data.vip.duracaoDays) {
    editError.textContent = "Informe a duracao do VIP.";
    return;
  }

  try {
    await updatePlayer(data.steamId, data);
    await syncBanList(data.steamId, data.status?.banido);
    editError.textContent = "Atualizado com sucesso.";
    await refreshPlayersList();
  } catch (error) {
    editError.textContent = "Erro ao atualizar jogador.";
  }
});

refreshBtn.addEventListener("click", async () => {
  if (!editSteamId.value.trim()) {
    return;
  }
  const player = await getPlayer(editSteamId.value.trim());
  if (player) {
    await ensureExpiredBenefits(player);
    fillEditForm(player);
    renderPlayerDetails(player);
  }
});

playersListRefreshBtn.addEventListener("click", async () => {
  await refreshPlayersList();
});

playersList.addEventListener("click", async (event) => {
  const item = event.target.closest(".player-item");
  if (!item) {
    return;
  }
  const steamId = item.dataset.steamid;
  if (!steamId) {
    return;
  }
  const player = await getPlayer(steamId);
  if (player) {
    await ensureExpiredBenefits(player);
    fillEditForm(player);
    showSearchResult(player);
    renderPlayerDetails(player);
  }
});

setupCurrencyInput(financeAmount);
setupCurrencyInput(expenseAmount);

financeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  financeError.textContent = "";

  const amountValue = parseAmount(financeAmount.value);
  if (!amountValue || amountValue <= 0) {
    financeError.textContent = "Informe um valor valido.";
    return;
  }

  if (!financeSource.value) {
    financeError.textContent = "Informe a origem do pagamento.";
    return;
  }

  if (!financeDescription.value.trim()) {
    financeError.textContent = "Informe a descricao.";
    return;
  }

  try {
    await addFinanceEntry({
      amount: amountValue,
      source: financeSource.value,
      description: financeDescription.value.trim(),
      reference: financeReference.value.trim(),
    });
    financeForm.reset();
    await refreshFinanceData();
  } catch (error) {
    financeError.textContent = "Erro ao registrar entrada.";
  }
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  expenseError.textContent = "";

  const amountValue = parseAmount(expenseAmount.value);
  if (!amountValue || amountValue <= 0) {
    expenseError.textContent = "Informe um valor valido.";
    return;
  }

  if (!expenseCategory.value) {
    expenseError.textContent = "Informe a categoria.";
    return;
  }

  if (!expenseDescription.value.trim()) {
    expenseError.textContent = "Informe a descricao.";
    return;
  }

  try {
    await addExpenseEntry({
      amount: amountValue,
      category: expenseCategory.value,
      description: expenseDescription.value.trim(),
      reference: expenseReference.value.trim(),
    });
    expenseForm.reset();
    await refreshFinanceData();
  } catch (error) {
    expenseError.textContent = "Erro ao registrar saida.";
  }
});

financeRefreshBtn.addEventListener("click", async () => {
  await refreshFinanceData();
});

notifBtn.addEventListener("click", async () => {
  notifPanel.classList.toggle("hidden");
  if (!notifPanel.classList.contains("hidden")) {
    await refreshNotifications();
  }
});

notifList.addEventListener("click", async (event) => {
  const item = event.target.closest(".notif-item");
  if (!item) {
    return;
  }
  const id = item.dataset.id;
  if (!id) {
    return;
  }
  openNotifModal({
    message: item.dataset.message,
    type: item.dataset.type,
    steamId: item.dataset.steamid,
    nick: item.dataset.nick,
    vipTipo: item.dataset.viptipo,
    seguroTipo: item.dataset.segurotipo,
    expires: item.dataset.expires,
    daysLeft: item.dataset.daysleft,
  });
  await markNotificationRead(id);
  await refreshNotifications();
});

notifModalClose.addEventListener("click", () => {
  notifModal.classList.add("hidden");
});

notifModal.addEventListener("click", (event) => {
  if (event.target === notifModal) {
    notifModal.classList.add("hidden");
  }
});

banRefreshBtn.addEventListener("click", async () => {
  await refreshBanList();
});

banForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  banError.textContent = "";

  const steamId = normalizeSteamId(banSteamId.value);
  if (!steamId) {
    banError.textContent = "Informe o SteamID.";
    return;
  }

  try {
    await addBanEntry(steamId, banReason.value.trim());
    banForm.reset();
    await refreshBanList();
  } catch (error) {
    banError.textContent = "Erro ao adicionar banimento.";
  }
});

banList.addEventListener("click", async (event) => {
  const removeBtn = event.target.closest("button[data-action='remove']");
  if (!removeBtn) {
    return;
  }
  const item = event.target.closest(".ban-item");
  if (!item) {
    return;
  }
  const steamId = item.dataset.steamid;
  if (!steamId) {
    return;
  }
  await removeBanEntry(steamId);
  await refreshBanList();
});

financeExportBtn.addEventListener("click", async () => {
  const [entries, expenses] = await Promise.all([
    listAllFinanceEntries(),
    listAllExpenseEntries(),
  ]);
  const merged = [
    ...entries.map((entry) => ({ ...entry, kind: "entrada" })),
    ...expenses.map((entry) => ({ ...entry, kind: "saida" })),
  ].sort((a, b) => {
    const dateA = getEntryDate(a) || new Date(0);
    const dateB = getEntryDate(b) || new Date(0);
    return dateB - dateA;
  });
  const rows = [
    ["Data", "Tipo", "Origem/Categoria", "Descricao", "Referencia", "Valor"],
    ...merged.map((entry) => {
      const dateText = entry.createdAt?.toDate
        ? entry.createdAt.toDate().toLocaleDateString("pt-BR")
        : "";
      return [
        dateText,
        entry.kind,
        entry.kind === "entrada" ? entry.source || "" : entry.category || "",
        entry.description || "",
        entry.reference || "",
        parseAmount(entry.amount),
      ];
    }),
  ];
  const csvContent = buildCsv(rows);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "financeiro.csv";
  link.click();
  URL.revokeObjectURL(url);
});
