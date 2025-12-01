import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase-client';
import { Button } from './ui/button';

type LogoutButtonProps = {
	redirectTo?: string; // optional location to send user after logout
	className?: string;
};

export function LogoutButton({ redirectTo = '/', className }: LogoutButtonProps) {
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleLogout = async () => {
		if (loading) return;
		setLoading(true);
		try {
			const { error } = await supabase.auth.signOut();
			if (error) {
				console.error('Logout error:', error.message);
			}
		} finally {
			setLoading(false);
			// Use client-side navigation for speed and to keep router state
			navigate(redirectTo);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleLogout}
			disabled={loading}
			className={className}
		>
			{loading ? 'Logging out…' : 'Logout'}
		</Button>
	);
}
