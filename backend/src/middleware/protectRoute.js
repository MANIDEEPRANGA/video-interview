import { clerkClient, requireAuth } from "@clerk/express";
import User from "../models/User.js";
import { upsertStreamUser } from "../lib/stream.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      // if user not found in db, try to sync from clerk (lazy sync)
      if (!user) {
        const clerkUser = await clerkClient.users.getUser(clerkId);

        user = await User.create({
          clerkId,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown",
          email: clerkUser.emailAddresses[0]?.emailAddress,
          profileImage: clerkUser.imageUrl,
        });

        // sync to stream as well
        await upsertStreamUser({
          id: user.clerkId,
          name: user.name,
          image: user.profileImage,
        });

        console.log("Lazy sync successful for user:", clerkId);
      }

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];
