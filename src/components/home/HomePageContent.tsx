// src/components/home/HomePageContent.tsx
"use client";

import React from 'react';
import ActivityCard from './ActivityCard';
import QuickMatch from './QuickMatch';
import FloatingVideoButton from '../FloatingVideoButton';
import { Leaf, Clock, ShoppingCart, Gift } from 'lucide-react';

export default function HomePageContent() {
  const activities = [
    {
      icon: <Leaf size={32} />,
      title: 'CATERING',
      description: 'Delight your guests with our flavors and presentation',
      route: '/activity/catering',
    },
    {
      icon: <Clock size={32} />,
      title: 'FAST DELIVERY',
      description: 'We deliver your order promptly to your door',
      route: '/activity/fast-delivery',
    },
    {
      icon: <ShoppingCart size={32} />,
      title: 'ONLINE ORDERING',
      description: 'Explore menu & order with ease using our Online Ordering',
      route: '/activity/online-ordering',
    },
    {
      icon: <Gift size={32} />,
      title: 'GIFT CARDS',
      description: 'Give the gift of exceptional dining with Foodi Gift Cards',
      route: '/activity/gift-cards',
    },
  ];

  return (
    <>
      {/* 您原有的所有代码完全不变 */}
      <section className="flex flex-1 p-6 gap-6 bg-[#f9fafb]">
        <div className="flex flex-col flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Activities</h2>
          <p className="text-sm text-gray-600 mb-6">
            The following are recommended activities. You can click on the modules you are interested in to learn more.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {activities.map((item) => (
              <ActivityCard key={item.title} {...item} />
            ))}
          </div>

          <button className="self-end bg-green-500 text-white px-6 py-2 rounded-md shadow hover:bg-green-600 transition">
            Explore
          </button>
        </div>

        <QuickMatch />
      </section>

      {/* 添加浮动视频通话按钮 */}
      <FloatingVideoButton />
    </>
  );
}