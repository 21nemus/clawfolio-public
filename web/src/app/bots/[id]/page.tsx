'use client';

import { redirect } from 'next/navigation';

export default function BotDetailPage({ params }: { params: { id: string } }) {
  redirect(`/agents/${params.id}`);
}
