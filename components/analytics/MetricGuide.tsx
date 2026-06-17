/**
 * 指標說明組件
 * 
 * 提供智慧燈泡圖示，點擊後彈出 Headless UI Dialog 展示指標說明
 */

'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Lightbulb, X, BarChart3, Sparkles } from 'lucide-react';

interface MetricGuideProps {
  title: string;        // 指標標題
  content: string;      // 指標含義
  value: string;        // 能提供的幫助
  icon: ReactNode;      // 圖示（呼叫端傳入已設定 className 的 Lucide JSX）
}

export function MetricGuide({ title, content, value, icon }: MetricGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 智慧燈泡按鈕 */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative bg-soft-yellow hover:bg-[#FFE8C7] p-1.5 rounded-full transition-all hover:scale-110 group"
        aria-label="查看指標說明"
      >
        <Lightbulb className="w-4 h-4 text-secondary animate-pulse group-hover:animate-none" />
      </button>

      {/* Headless UI Dialog */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          {/* 背景遮罩 */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          {/* 彈窗容器 */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-start justify-center p-4 pt-20">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-white to-background p-6 shadow-xl transition-all border border-primary/10 relative">
                  {/* 關閉按鈕 */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="關閉"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* 標題區 */}
                  <div className="flex items-center gap-3 mb-5 pr-8">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <Dialog.Title className="text-lg font-medium text-foreground">
                      {title}
                    </Dialog.Title>
                  </div>

                  {/* 內容區 */}
                  <div className="space-y-4 mb-6">
                    {/* 指標含義 */}
                    <div className="bg-soft-green rounded-xl p-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        指標含義
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {content}
                      </p>
                    </div>

                    {/* 能提供的幫助 */}
                    <div className="bg-soft-yellow rounded-xl p-4">
                      <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                        能提供的幫助
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {value}
                      </p>
                    </div>
                  </div>

                  {/* 溫柔提示 */}
                  <div className="bg-primary/5 rounded-xl p-3 mb-4">
                    <p className="text-xs text-muted-foreground leading-relaxed text-center">
                      <span className="font-medium text-foreground inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                        溫馨提示
                      </span>
                      <br />
                      持續記錄數據，讓分析更精準，幫助您做出更好的經營決策
                    </p>
                  </div>

                  {/* 關閉按鈕 */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
                  >
                    知道了
                  </button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
