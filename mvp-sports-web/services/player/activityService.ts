import { db } from "@/services/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export type ActivityType = "booking" | "payment" | "matchmaking" | "achievement" | "comment" | "follow";

export interface ActivityData {
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp?: Timestamp;
  data: {
    bookingId?: string;
    courtName?: string;
    sport?: string;
    amount?: number;
    paymentMethod?: string;
    matchId?: string;
    opponentName?: string;
    achievement?: string;
    commentText?: string;
  };
}

class ActivityService {
  async logActivity(activity: Omit<ActivityData, "timestamp">) {
    try {
      await addDoc(collection(db, "activities"), {
        ...activity,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error logging activity:", error);
      throw error;
    }
  }

  async logBooking(
    userId: string,
    userName: string,
    bookingId: string,
    courtName: string,
    sport: string
  ) {
    return this.logActivity({
      type: "booking",
      userId,
      userName,
      data: { bookingId, courtName, sport },
    });
  }

  async logPayment(
    userId: string,
    userName: string,
    amount: number,
    paymentMethod: string
  ) {
    return this.logActivity({
      type: "payment",
      userId,
      userName,
      data: { amount, paymentMethod },
    });
  }

  async logMatchmaking(
    userId: string,
    userName: string,
    matchId: string,
    opponentName: string,
    sport: string
  ) {
    return this.logActivity({
      type: "matchmaking",
      userId,
      userName,
      data: { matchId, opponentName, sport },
    });
  }

  async logAchievement(
    userId: string,
    userName: string,
    achievement: string
  ) {
    return this.logActivity({
      type: "achievement",
      userId,
      userName,
      data: { achievement },
    });
  }

  async logComment(
    userId: string,
    userName: string,
    commentText: string
  ) {
    return this.logActivity({
      type: "comment",
      userId,
      userName,
      data: { commentText },
    });
  }

  async logFollow(
    userId: string,
    userName: string,
    opponentName: string
  ) {
    return this.logActivity({
      type: "follow",
      userId,
      userName,
      data: { opponentName },
    });
  }
}

export const activityService = new ActivityService();
