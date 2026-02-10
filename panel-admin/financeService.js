import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

const financeCollection = "financeEntries";
const expenseCollection = "financeExpenses";

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

export const addFinanceEntry = async (entry) => {
  const payload = {
    amount: Number(entry.amount),
    source: entry.source,
    description: entry.description,
    reference: entry.reference || "",
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, financeCollection), payload);
  return payload;
};

export const addExpenseEntry = async (entry) => {
  const payload = {
    amount: Number(entry.amount),
    category: entry.category,
    description: entry.description,
    reference: entry.reference || "",
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, expenseCollection), payload);
  return payload;
};

export const listFinanceEntries = async (limitCount = 10) => {
  const q = query(
    collection(db, financeCollection),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const listAllFinanceEntries = async () => {
  const q = query(
    collection(db, financeCollection),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const listExpenseEntries = async (limitCount = 10) => {
  const q = query(
    collection(db, expenseCollection),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const listAllExpenseEntries = async () => {
  const q = query(
    collection(db, expenseCollection),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const getFinanceSummary = async () => {
  const snapshot = await getDocs(collection(db, financeCollection));
  let total = 0;
  const totalsBySource = {
    "loja GRABS": 0,
    VIPs: 0,
  };
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const amount = parseAmount(data.amount);
    total += amount;
    if (data.source && Object.hasOwn(totalsBySource, data.source)) {
      totalsBySource[data.source] += amount;
    }
  });
  return { total, count: snapshot.size, totalsBySource };
};

export const getExpenseSummary = async () => {
  const snapshot = await getDocs(collection(db, expenseCollection));
  let total = 0;
  const totalsByCategory = {};
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const amount = parseAmount(data.amount);
    total += amount;
    if (data.category) {
      totalsByCategory[data.category] =
        (totalsByCategory[data.category] || 0) + amount;
    }
  });
  return { total, count: snapshot.size, totalsByCategory };
};
