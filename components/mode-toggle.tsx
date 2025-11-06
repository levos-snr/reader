"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ModeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button
				variant="outline"
				size="icon"
				className="w-9 h-9"
				aria-label="Toggle theme"
			>
				<div className="w-4 h-4" />
			</Button>
		);
	}

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			className="w-9 h-9 bg-background border-border hover:bg-card transition-colors"
			aria-label="Toggle theme"
		>
			{theme === "dark" ? (
				<Sun className="w-4 h-4 text-primary" />
			) : (
				<Moon className="w-4 h-4 text-primary" />
			)}
		</Button>
	);
}
