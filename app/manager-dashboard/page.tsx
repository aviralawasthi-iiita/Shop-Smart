"use client"
import React, { useState, useEffect } from "react";
import ManagerDashboardClient from "./client";

interface Announcement {
  id: number;
  title: string;
  descrip?: string;
  storeId: number;
  createdAt: string;
}

export default function ManagerDashboardPage() {
  // State for announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const res = await fetch('/api/manager/announcement');
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        const data = await res.json();
        // The API returns the array directly, so data is the array
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch announcements:', err);
      }
    }
    loadAnnouncements();
  }, []);



  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manager Dashboard</h1>
      <p className="text-lg mb-8">Review and manage quiet time requests from customers.</p>

      <ManagerDashboardClient announcements={announcements} setAnnouncements={setAnnouncements} />
    </div>
  );
}
