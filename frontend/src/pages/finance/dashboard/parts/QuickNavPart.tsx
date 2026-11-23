import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Receipt, Scale, Sparkles } from 'lucide-react';
import { QuickNavLinkCard } from '../components/QuickNavLinkCard';

export const QuickNavPart: React.FC = () => {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900">Phân Hệ Tài Chính</h4>
                <div className="mt-3 space-y-2">
                    <QuickNavLinkCard
                        to="/finance/budgets"
                        icon={<Calculator className="h-4 w-4" />}
                        iconBgClass="bg-purple-50 group-hover:bg-purple-100"
                        iconTextClass="text-purple-600"
                        title="Dự Toán Ngân Sách"
                        description="Lập & duyệt hạng mục chi phí"
                    />

                    <QuickNavLinkCard
                        to="/finance/expenses"
                        icon={<Receipt className="h-4 w-4" />}
                        iconBgClass="bg-amber-50 group-hover:bg-amber-100"
                        iconTextClass="text-amber-600"
                        title="Thực Chi & Duyệt Chi"
                        description="Đính kèm chứng từ S3 & duyệt chi"
                    />

                    <QuickNavLinkCard
                        to="/finance/benchmarks"
                        icon={<Scale className="h-4 w-4" />}
                        iconBgClass="bg-blue-50 group-hover:bg-blue-100"
                        iconTextClass="text-blue-600"
                        title="Bảng Giá Benchmark"
                        description="Master Catalog đơn giá thị trường"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    Tính Năng Kế Thừa Mùa Mới
                </div>
                <p className="mt-2 text-xs leading-relaxed text-emerald-950">
                    Tự động lấy số lượng thực tế đã chi mùa trước nhân với đơn giá thị trường hiện hành để tạo dự toán mùa mới ngay lập tức.
                </p>
                <Link
                    to="/finance/budgets"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
                >
                    Dùng thử trong Dự toán &rarr;
                </Link>
            </div>
        </div>
    );
};

