import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

const playersCollection = "players";
const banListCollection = "banList";

const buildPlayerPayload = (data, isCreate) => {
  const now = serverTimestamp();
  const payload = {
    steamId: data.steamId,
    nick: data.nick,
    nome: data.nome,
    updatedAt: now,
    lastSeenAt: data.lastSeenAt ?? now,
    status: {
      banido: Boolean(data.status?.banido),
      whitelist: Boolean(data.status?.whitelist),
    },
    vip: {
      ativo: Boolean(data.vip?.ativo),
      tipo: data.vip?.tipo || "",
      duracaoDays: data.vip?.duracaoDays || null,
      inicio: data.vip?.inicio || null,
      fim: data.vip?.fim || null,
    },
    seguro: {
      ativo: Boolean(data.seguro?.ativo),
      tipo: data.seguro?.tipo || "",
      inicio: data.seguro?.inicio || null,
      fim: data.seguro?.fim || null,
    },
  };

  if (isCreate) {
    payload.createdAt = now;
  }

  return payload;
};

const getPlayerRef = (steamId) => doc(db, playersCollection, steamId);
const getBanRef = (steamId) => doc(db, banListCollection, steamId);

export const getPlayer = async (steamId) => {
  const snapshot = await getDoc(getPlayerRef(steamId));
  return snapshot.exists() ? snapshot.data() : null;
};

export const createPlayer = async (playerData) => {
  const ref = getPlayerRef(playerData.steamId);
  const payload = buildPlayerPayload(playerData, true);
  await setDoc(ref, payload);
  return payload;
};

export const updatePlayer = async (steamId, playerData) => {
  const ref = getPlayerRef(steamId);
  const payload = buildPlayerPayload(playerData, false);
  await updateDoc(ref, payload);
  return payload;
};

export const getBanEntry = async (steamId) => {
  const snapshot = await getDoc(getBanRef(steamId));
  return snapshot.exists() ? snapshot.data() : null;
};

export const syncBanList = async (steamId, isBanned) => {
  if (isBanned) {
    await setDoc(
      getBanRef(steamId),
      {
        steamId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await deleteDoc(getBanRef(steamId));
};

export const addBanEntry = async (steamId, reason = "") => {
  await setDoc(
    getBanRef(steamId),
    {
      steamId,
      reason,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const removeBanEntry = async (steamId) => {
  await deleteDoc(getBanRef(steamId));
};

export const listBanEntries = async (limitCount = 50) => {
  const q = query(
    collection(db, banListCollection),
    orderBy("updatedAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    steamId: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const listPlayers = async (limitCount = 20) => {
  const q = query(
    collection(db, playersCollection),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    steamId: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const ensureExpiredBenefits = async (playerData) => {
  const now = new Date();
  const updates = {
    vip: { ...playerData.vip },
    seguro: { ...playerData.seguro },
  };

  const vipExpired = playerData.vip?.fim && playerData.vip.fim.toDate() < now;
  const seguroExpired =
    playerData.seguro?.fim && playerData.seguro.fim.toDate() < now;

  if (vipExpired) {
    updates.vip.ativo = false;
  }

  if (seguroExpired) {
    updates.seguro.ativo = false;
  }

  if (vipExpired || seguroExpired) {
    await updateDoc(getPlayerRef(playerData.steamId), updates);
  }

  return { vipExpired, seguroExpired };
};
