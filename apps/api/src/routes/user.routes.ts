
import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { getUserById } from "../services/auth.service.js";

const router = Router();

// Every route below requires authentication.
router.use(authenticate);

router.get("/me", async (req, res) => {
    const user = await getUserById(req.user!.id);

    res.status(200).json({
        status: "success",
        data: {
            user,
        },
    });
});

export default router;
