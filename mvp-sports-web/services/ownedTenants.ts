import { collection, doc, getDoc, getDocs, query, where, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/services/firebase";

// Recintos que el usuario puede gestionar:
//  - admin/superadmin: todos (soporte y operación de cualquier recinto)
//  - owner: dueño principal (ownerId) o co-dueño (ownerIds)
// Devuelve una forma compatible con QuerySnapshot (docs/size/empty/forEach).
export async function getOwnedTenantsSnap(uid: string) {
  const role = String((await getDoc(doc(db, "users", uid))).data()?.role || "").toLowerCase();
  let docs: QueryDocumentSnapshot<DocumentData>[];
  if (role === "admin" || role === "superadmin") {
    docs = (await getDocs(collection(db, "tenants"))).docs;
  } else {
    const [byOwner, byOwners] = await Promise.all([
      getDocs(query(collection(db, "tenants"), where("ownerId", "==", uid))),
      getDocs(query(collection(db, "tenants"), where("ownerIds", "array-contains", uid))),
    ]);
    const map = new Map<string, QueryDocumentSnapshot<DocumentData>>();
    [...byOwner.docs, ...byOwners.docs].forEach((d) => map.set(d.id, d));
    docs = Array.from(map.values());
  }
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (d: QueryDocumentSnapshot<DocumentData>) => void) => docs.forEach(fn) };
}
