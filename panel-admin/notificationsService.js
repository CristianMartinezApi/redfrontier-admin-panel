import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

const notificationsCollection = "notifications";

export const upsertNotification = async (id, payload) => {
  await setDoc(
    doc(db, notificationsCollection, id),
    {
      id,
      type: payload.type,
      steamId: payload.steamId,
      nick: payload.nick || "",
      vipTipo: payload.vipTipo || "",
      seguroTipo: payload.seguroTipo || "",
      expiresAt: payload.expiresAt || null,
      daysLeft: payload.daysLeft ?? null,
      message: payload.message,
      read: Boolean(payload.read),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const removeNotification = async (id) => {
  await deleteDoc(doc(db, notificationsCollection, id));
};

export const listNotifications = async (limitCount = 50) => {
  const q = query(
    collection(db, notificationsCollection),
    orderBy("updatedAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const markNotificationRead = async (id) => {
  await updateDoc(doc(db, notificationsCollection, id), {
    read: true,
    updatedAt: serverTimestamp(),
  });
};
