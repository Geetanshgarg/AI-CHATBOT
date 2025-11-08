import { Request, Response, NextFunction } from "express";
import User from "../models/user-model.js";
import { configureGemini } from "../configs/gemini-config.js";

export const generateChatCompletion = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { message } = req.body;

		const user = await User.findById(res.locals.jwtData.id);
		if (!user) {
			return res.status(401).json("User not registered / token malfunctioned");
		}

		// grab chats of users
		const chats = user.chats.map(({ role, content }) => ({
			role,
			content,
		}));
		chats.push({ content: message, role: "user" });

		// save chats inside real user object
		user.chats.push({ content: message, role: "user" });

		// send all chats with new ones to Gemini API
		const genAI = configureGemini();
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

		// Build chat history for Gemini (convert to Gemini format)
		const history = chats.slice(0, -1).map((chat) => ({
			role: chat.role === "user" ? "user" : "model",
			parts: [{ text: chat.content }],
		}));

		// Start chat with history
		const chat = model.startChat({ history });

		// Send the latest message
		const result = await chat.sendMessage(message);
		const response = await result.response;
		const responseText = response.text();

		// push latest response to db
		user.chats.push({ content: responseText, role: "assistant" });
		await user.save();

		return res.status(200).json({ chats: user.chats });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: error.message });
	}
};

export const getAllChats = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = await User.findById(res.locals.jwtData.id); // get variable stored in previous middleware
        
		if (!user)
			return res.status(401).json({
				message: "ERROR",
				cause: "User doesn't exist or token malfunctioned",
			});

		if (user._id.toString() !== res.locals.jwtData.id) {
			return res
				.status(401)
				.json({ message: "ERROR", cause: "Permissions didn't match" });
		}
		return res.status(200).json({ message: "OK", chats: user.chats });
	} catch (err) {
		console.log(err);
		return res.status(200).json({ message: "ERROR", cause: err.message });
	}
};

export const deleteAllChats = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = await User.findById(res.locals.jwtData.id); // get variable stored in previous middleware
        
		if (!user)
			return res.status(401).json({
				message: "ERROR",
				cause: "User doesn't exist or token malfunctioned",
			});

		if (user._id.toString() !== res.locals.jwtData.id) {
			return res
				.status(401)
				.json({ message: "ERROR", cause: "Permissions didn't match" });
		}

        //@ts-ignore
        user.chats = []
        await user.save()
		return res.status(200).json({ message: "OK", chats: user.chats });
	} catch (err) {
		console.log(err);
		return res.status(200).json({ message: "ERROR", cause: err.message });
	}
};