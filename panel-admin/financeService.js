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

export const getFinanceSummary = async () => {
  const snapshot = await getDocs(collection(db, financeCollection));
  let total = 0;
  const totalsBySource = {
    "loja GRABS": 0,
    VIPs: 0,
  };
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const amount = Number(data.amount || 0);
    total += amount;
    if (data.source && Object.hasOwn(totalsBySource, data.source)) {
      totalsBySource[data.source] += amount;
    }
  });
  return { total, count: snapshot.size, totalsBySource };
};
