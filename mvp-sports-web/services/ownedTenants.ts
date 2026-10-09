import { collection, getDocs, query, where, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/services/firebase";

// Recintos de un owner: dueño principal (ownerId) o co-dueño (ownerIds).
// Devuelve una forma compatible con QuerySnapshot (docs/size/empty/forEach).
export async function getOwnedTenantsSnap(uid: string) {
  const [byOwner, byOwners] = await Promise.all([
    getDocs(query(collection(db, "tenants"), where("ownerId", "==", uid))),
    getDocs(query(collection(db, "tenants"), where("ownerIds", "array-contains", uid))),
  ]);
  const map = new Map<string, QueryDocumentSnapshot<DocumentData>>();
  [...byOwner.docs, ...byOwners.docs].forEach((d) => map.set(d.id, d));
  const docs = Array.from(map.values());
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (d: QueryDocumentSnapshot<DocumentData>) => void) => docs.forEach(fn) };
}
