import {
    defineServer,
    defineRoom,
    monitor,
    playground,
} from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

import "dotenv/config";
import express from "express";

/**
 * Import Room handlers
 */
import { GameRoom } from "./rooms/GameRoom.js";
import { SessionRoom } from "./rooms/SessionRoom.js";

/**
 * Import routes
 */
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import inventoryRoutes from "./routes/inventory.js";
import furnitureRoutes from "./routes/furniture.js";
import shopRoutes from "./routes/shop.js";

const server = defineServer({
    transport: new WebSocketTransport(),

    rooms: {
        game_room: defineRoom(GameRoom).filterBy(["dbRoomId"]),
        session: defineRoom(SessionRoom),
    },

    express: (app) => {
        // JSON body parser
        app.use(express.json());

        // CORS for frontend
        app.use((_req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            if (_req.method === "OPTIONS") {
                res.sendStatus(204);
                return;
            }
            next();
        });

        // API routes
        app.use("/api/auth", authRoutes);
        app.use("/api/rooms", roomRoutes);
        app.use("/api/inventory", inventoryRoutes);
        app.use("/api/furniture", furnitureRoutes);
        app.use("/api/shop", shopRoutes);

        // Health check
        app.get("/api/health", (_req, res) => {
            res.json({ status: "ok" });
        });

        /**
         * Colyseus Monitor
         */
        app.use("/monitor", monitor());

        /**
         * Colyseus Playground (dev only)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }
    }

});

export default server;