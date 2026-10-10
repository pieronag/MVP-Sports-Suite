import { db } from "@/services/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp, orderBy } from "firebase/firestore";

export interface MatchRequest {
  id: string;
  uid: string;
  type: "need" | "join";
  sport: string;
  city: string;
  level?: string;
  maxPlayers?: number;
  currentPlayers?: number;
  description?: string;
  createdAt: Timestamp;
}

class MatchmakingService {
  async getAvailablePlayers(uid: string, filters: { sport?: string; level?: string; city?: string } = {}) {
    try {
      const q = query(
        collection(db, "matchmaking"),
        where("uid", "!=", uid),
        where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MatchRequest));

      if (filters.sport) results = results.filter((r) => r.sport === filters.sport);
      if (filters.level) results = results.filter((r) => r.level === filters.level);
      if (filters.city) results = results.filter((r) => r.city === filters.city);

      return results;
    } catch (error) {
      console.error("Error getting available players:", error);
      return [];
    }
  }

  async getUserRequests(uid: string) {
    try {
      const q = query(collection(db, "matchmaking"), where("uid", "==", uid), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MatchRequest));
    } catch (error) {
      console.error("Error getting user requests:", error);
      return [];
    }
  }

  async postRequest(uid: string, data: Omit<MatchRequest, "id" | "createdAt">) {
    try {
      const docRef = await addDoc(collection(db, "matchmaking"), {
        ...data,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error posting request:", error);
      throw error;
    }
  }

  async deleteRequest(requestId: string) {
    try {
      await deleteDoc(doc(db, "matchmaking", requestId));
    } catch (error) {
      console.error("Error deleting request:", error);
      throw error;
    }
  }

  async joinRequest(requestId: string, currentPlayers: number) {
    try {
      await updateDoc(doc(db, "matchmaking", requestId), {
        currentPlayers: currentPlayers + 1,
      });
    } catch (error) {
      console.error("Error joining request:", error);
      throw error;
    }
  }
}

export const matchmakingService = new MatchmakingService();
