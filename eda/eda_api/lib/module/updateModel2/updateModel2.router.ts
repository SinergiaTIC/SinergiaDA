import express from 'express';
import { updateModel2 } from './updateModel2.controller';

const router = express.Router();

router.get("/getinfo", updateModel2.getinfo);

export default router;
