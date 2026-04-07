"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';

type Language = 'en' | 'zh';

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

export const translations: Translations = {
  // General
  "loading": { en: "Loading...", zh: "加载中..." },
  "save": { en: "Save", zh: "保存" },
  "cancel": { en: "Cancel", zh: "取消" },
  "edit": { en: "Edit", zh: "编辑" },
  "delete": { en: "Delete", zh: "删除" },
  "actions": { en: "Actions", zh: "操作" },
  "status": { en: "Status", zh: "状态" },
  "active": { en: "Active", zh: "活跃" },
  "inactive": { en: "Inactive", zh: "未活跃" },
  "search": { en: "Search...", zh: "搜索..." },
  
  // Login Page
  "sign_in": { en: "Sign In", zh: "登录" },
  "email": { en: "Email", zh: "邮箱" },
  "password": { en: "Password", zh: "密码" },
  "login": { en: "Login", zh: "登录" },
  "sign_in_google": { en: "Sign in with Google", zh: "使用 Google 登录" },
  "account_inactive": { en: "Your account is inactive. Please contact the administrator.", zh: "您的帐户已被停用。请联系管理员。" },
  
  // Admin Dashboard
  "admin_dashboard": { en: "Admin Dashboard", zh: "管理员控制台" },
  "super_admin_dashboard": { en: "Super Admin Dashboard", zh: "超级管理员控制台" },
  "users": { en: "Users", zh: "用户" },
  "tonights_orders": { en: "Tonight's Orders", zh: "今晚订单" },
  "manage_categories": { en: "Manage Categories", zh: "管理分类" },
  "manage_items": { en: "Manage Items", zh: "管理商品" },
  "purchase_report": { en: "Purchase Report", zh: "采购报告" },
  "select_date": { en: "Select Date:", zh: "选择日期：" },
  "orders_for": { en: "Orders for", zh: "订单日期" },
  "restaurant": { en: "Restaurant", zh: "餐厅" },
  "total_items": { en: "Total Items", zh: "总商品数" },
  "est_total": { en: "Est. Total", zh: "预计总计" },
  "order_details": { en: "Order Details", zh: "订单详情" },
  "acknowledge_order": { en: "Acknowledge Order", zh: "确认订单" },
  "no_orders_tonight": { en: "No orders for tonight yet.", zh: "今晚暂无订单。" },
  "add_new_category": { en: "Add New Category", zh: "添加新分类" },
  "edit_category": { en: "Edit Category", zh: "编辑分类" },
  "category_name": { en: "Category Name", zh: "分类名称" },
  "display_order": { en: "Display Order", zh: "显示顺序" },
  "save_category": { en: "Save Category", zh: "保存分类" },
  "market_categories": { en: "Market Categories", zh: "市场分类" },
  "no_categories_found": { en: "No categories found. Add one to get started.", zh: "未找到分类。添加一个以开始。" },
  "search_items": { en: "Search items...", zh: "搜索商品..." },
  "bulk_actions": { en: "Bulk Actions", zh: "批量操作" },
  "activate_selected": { en: "Activate Selected", zh: "激活所选" },
  "deactivate_selected": { en: "Deactivate Selected", zh: "停用所选" },
  "change_category": { en: "Change Category", zh: "更改分类" },
  "add_new_item": { en: "Add New Item", zh: "添加新商品" },
  "edit_item": { en: "Edit Item", zh: "编辑商品" },
  "category": { en: "Category", zh: "分类" },
  "select_category": { en: "Select Category", zh: "选择分类" },
  "item_name": { en: "Item Name", zh: "商品名称" },
  "min_price": { en: "Min Price", zh: "最低价格" },
  "max_price": { en: "Max Price", zh: "最高价格" },
  "unit_label": { en: "Unit (e.g., kg, bundle, box)", zh: "单位 (例如: kg, bundle, box)" },
  "save_item": { en: "Save Item", zh: "保存商品" },
  "change_category_for": { en: "Change Category for", zh: "更改分类" },
  "update_category": { en: "Update Category", zh: "更新分类" },
  "market_items": { en: "Market Items", zh: "市场商品" },
  "no_items_found": { en: "No items found. Add one to get started.", zh: "未找到商品。添加一个以开始。" },
  "no_items_match": { en: "No items match your search.", zh: "没有符合您搜索的商品。" },
  "consolidated_purchase_list": { en: "Consolidated Purchase List", zh: "综合采购清单" },
  "print_list": { en: "Print List", zh: "打印清单" },
  "item_to_buy": { en: "Item to Buy", zh: "要购买的商品" },
  "total_quantity": { en: "Total Quantity", zh: "总数量" },
  "breakdown": { en: "Breakdown", zh: "明细" },
  "no_items_to_purchase": { en: "No items to purchase yet.", zh: "暂无需要采购的商品。" },
  "item_saved": { en: "Item saved successfully", zh: "商品保存成功" },
  "category_saved": { en: "Category saved successfully", zh: "分类保存成功" },
  "successfully": { en: "Successfully", zh: "成功" },
  "activated": { en: "activated", zh: "激活" },
  "deactivated": { en: "deactivated", zh: "停用" },
  "failed_to_update": { en: "Failed to update", zh: "更新失败" },
  "successfully_changed_category": { en: "Successfully changed category for", zh: "成功更改分类" },
  "bulk_acknowledge": { en: "Bulk Acknowledge", zh: "批量确认" },
  "no_submitted_orders_to_acknowledge": { en: "No submitted orders to acknowledge.", zh: "没有待确认的已提交订单。" },
  "successfully_acknowledged_orders": { en: "Successfully acknowledged orders", zh: "成功确认订单" },
  "acknowledging": { en: "Acknowledging...", zh: "确认中..." },
  "order_acknowledged": { en: "Order acknowledged", zh: "订单已确认" },
  "unauthorized": { en: "Unauthorized", zh: "未授权" },
  "generated_on": { en: "Generated on", zh: "生成于" },
  "categories_reordered": { en: "Categories reordered successfully", zh: "分类重新排序成功" },
  "with_precision": { en: "with precision.", zh: "精确管理。" },
  "est_revenue": { en: "Est. Revenue", zh: "预计收入" },
  "live_market_estimates": { en: "Live Market Estimates", zh: "实时市场预估" },
  "active_restaurants": { en: "Active Restaurants", zh: "活跃餐厅" },
  "participation_today": { en: "Participation Today", zh: "今日参与" },
  "orders_date_appear": { en: "Orders for the selected date will appear here.", zh: "所选日期的订单将显示在此处。" },
  "add_category_started": { en: "Add a new category to get started.", zh: "添加新分类以开始。" },
  "unknown": { en: "Unknown", zh: "未知" },
  "adjust_search_add_item": { en: "Try adjusting your search or add a new item.", zh: "尝试调整搜索或添加新商品。" },
  "no_orders_placed_date": { en: "No orders have been placed for this date yet.", zh: "该日期尚未下达任何订单。" },
  "restaurant_partner": { en: "Restaurant Partner", zh: "餐厅合作伙伴" },
  "manage_daily_orders_ease": { en: "Manage your daily market orders and inventory with ease.", zh: "轻松管理您的每日市场订单和库存。" },
  "browse_market_items_begin": { en: "Browse the market items below to start your daily order.", zh: "浏览下方的市场商品以开始您的每日订单。" },
  "est_total_rm": { en: "Estimated Total RM", zh: "预计总额 RM" },
  "market_range": { en: "Market Range:", zh: "市场范围：" },
  "in_cart": { en: "IN CART", zh: "购物车中" },
  "market_max_rm": { en: "Market Max: RM", zh: "市场最高价: RM" },
  "no_items_matching_filter": { en: "We couldn't find any items matching your search or category filter.", zh: "我们找不到符合您的搜索或分类过滤条件的任何商品。" },
  "clear_all_filters": { en: "Clear all filters", zh: "清除所有过滤器" },
  "items_in_your_order": { en: "Items in your order", zh: "您订单中的商品" },
  "unique_items": { en: "unique items", zh: "件商品" },
  "basket_waiting_fresh_produce": { en: "Your basket is waiting for some fresh produce. Head over to the browse tab to begin.", zh: "您的购物篮正在等待新鲜农产品。前往浏览标签页开始吧。" },
  "order_summary": { en: "Order Summary", zh: "订单摘要" },
  "subtotal_min": { en: "Subtotal (Min)", zh: "小计 (最低)" },
  "subtotal_max": { en: "Subtotal (Max)", zh: "小计 (最高)" },
  "free_delivery": { en: "FREE DELIVERY", zh: "免费送货" },
  "submit_agreement_policy": { en: "By submitting, you agree to the daily market prices. Final invoice will be provided upon delivery.", zh: "提交即表示您同意每日市场价格。最终发票将在送货时提供。" },
  "completed_orders": { en: "completed orders", zh: "个已完成订单" },
  "items_ordered": { en: "Items Ordered", zh: "已订购商品" },
  "total_paid_rm": { en: "Total Paid RM", zh: "总支付额 RM" },
  "details": { en: "Details", zh: "详情" },
  "total_estimated_price_label": { en: "Total Estimated Price", zh: "总预计价格" },
  "order_history_empty_first_order": { en: "Your order history is currently empty. Once you complete your first order, it will appear here.", zh: "您的订单历史目前为空。完成第一笔订单后，它将显示在此处。" },
  
  // User Management
  "user_management": { en: "User Management", zh: "用户管理" },
  "add_new_user": { en: "Add New User", zh: "添加新用户" },
  "all_users": { en: "All Users", zh: "所有用户" },
  "name": { en: "Name", zh: "姓名" },
  "role": { en: "Role", zh: "角色" },
  "view_details": { en: "View Details", zh: "查看详情" },
  "toggle_status": { en: "Toggle Status", zh: "切换状态" },
  "edit_user": { en: "Edit User", zh: "编辑用户" },
  "password_optional": { en: "Password (Optional - for Email Login)", zh: "密码 (可选 - 用于邮箱登录)" },
  "leave_blank_google": { en: "Leave blank if using Google Login only", zh: "如果仅使用 Google 登录请留空" },
  "admin_driver": { en: "Admin (Driver)", zh: "管理员 (司机)" },
  "super_admin": { en: "Super Admin", zh: "超级管理员" },
  "phone": { en: "Phone", zh: "电话" },
  "address": { en: "Address", zh: "地址" },
  "save_user": { en: "Save User", zh: "保存用户" },
  "user_saved": { en: "User saved successfully", zh: "用户保存成功" },
  "user_status_updated": { en: "User status updated", zh: "用户状态已更新" },
  
  // Restaurant Dashboard
  "restaurant_dashboard": { en: "Restaurant Dashboard", zh: "餐厅控制台" },
  "my_orders": { en: "My Orders", zh: "我的订单" },
  "new_order": { en: "New Order", zh: "新订单" },
  "submit_order": { en: "Submit Order", zh: "提交订单" },
  "save_draft": { en: "Save Draft", zh: "保存草稿" },
  "total_estimated_price": { en: "Total Estimated Price", zh: "预计总价" },
  "sign_out": { en: "Sign Out", zh: "登出" },
  "welcome": { en: "Welcome", zh: "欢迎" },
  "cutoff_in": { en: "Cut-off in:", zh: "截止时间剩余：" },
  "cutoff_reached": { en: "Cut-off reached", zh: "已截止" },
  "tonights_order_status": { en: "Tonight's Order Status", zh: "今晚订单状态" },
  "order_for_delivery_tomorrow": { en: "Order for delivery tomorrow morning.", zh: "明早送达的订单。" },
  "driver_acknowledged": { en: "Driver has acknowledged your order. Preparing for market.", zh: "司机已确认您的订单。正在准备采购。" },
  "order_submitted_waiting": { en: "Order submitted. Waiting for driver acknowledgment.", zh: "订单已提交。等待司机确认。" },
  "draft_saved_submit_before": { en: "Draft saved. Please submit before 4:00 AM.", zh: "草稿已保存。请在凌晨 4:00 前提交。" },
  "no_order_started": { en: "No order started for tonight. Browse items to begin.", zh: "今晚尚未开始订单。浏览商品以开始。" },
  "estimated_total": { en: "Estimated Total", zh: "预计总计" },
  "browse_items": { en: "Browse Items", zh: "浏览商品" },
  "my_cart": { en: "My Cart", zh: "我的购物车" },
  "order_history": { en: "Order History", zh: "历史订单" },
  "add_to_cart": { en: "Add to Cart", zh: "加入购物车" },
  "current_order_items": { en: "Current Order Items", zh: "当前订单商品" },
  "item": { en: "Item", zh: "商品" },
  "est_price": { en: "Est. Price", zh: "预计价格" },
  "quantity": { en: "Quantity", zh: "数量" },
  "total_est": { en: "Total Est.", zh: "预计总计" },
  "cart_is_empty": { en: "Cart is empty.", zh: "购物车是空的。" },
  "past_orders": { en: "Past Orders", zh: "过往订单" },
  "date": { en: "Date", zh: "日期" },
  "items": { en: "Items", zh: "商品" },
  "no_past_orders": { en: "No past orders found.", zh: "未找到过往订单。" },
  "cannot_edit_after_cutoff": { en: "Cannot edit order after cut-off or acknowledgment.", zh: "截止时间后或确认后无法编辑订单。" },
  "added_to_cart": { en: "Added to cart", zh: "已加入购物车" },
  "order_submitted": { en: "Order submitted", zh: "订单已提交" },
  "order_saved_as_draft": { en: "Order saved as draft", zh: "订单已保存为草稿" },
  "draft": { en: "Draft", zh: "草稿" },
  "submitted": { en: "Submitted", zh: "已提交" },
  "acknowledged": { en: "Acknowledged", zh: "已确认" },
  "order_date": { en: "Order Date", zh: "订单日期" },
  "price": { en: "Price", zh: "价格" },
  "total": { en: "Total", zh: "总计" },
  "print": { en: "Print", zh: "打印" },
  "order_id": { en: "Order ID", zh: "订单 ID" },
  "manage_orders_and_inventory": { en: "Manage Orders and Inventory", zh: "管理订单和库存" },
  "category_image": { en: "Category Image", zh: "分类图片" },
  "item_image": { en: "Item Image", zh: "商品图片" },
  "new_category": { en: "New Category", zh: "新分类" },
  "all_categories": { en: "All Categories", zh: "所有分类" },
  "update_order": { en: "Update Order", zh: "更新订单" },
  
  // Roles
  "role_super_admin": { en: "Super Admin", zh: "超级管理员" },
  "role_admin": { en: "Admin", zh: "管理员" },
  "role_restaurant": { en: "Restaurant", zh: "餐厅" },

  // Common Products & Units (Dynamic mapping)
  "Ginger": { en: "Ginger", zh: "生姜" },
  "Milk": { en: "Milk", zh: "牛奶" },
  "Bread": { en: "Bread", zh: "面包" },
  "Beef": { en: "Beef", zh: "牛肉" },
  "Prawn": { en: "Prawn", zh: "虾" },
  "Eggs": { en: "Eggs", zh: "鸡蛋" },
  "Chicken": { en: "Chicken", zh: "鸡肉" },
  "Fish": { en: "Fish", zh: "鱼" },
  "Fruits": { en: "Fruits", zh: "水果" },
  "Rice": { en: "Rice", zh: "大米" },
  "Oil": { en: "Oil", zh: "油" },
  "Sugar": { en: "Sugar", zh: "糖" },
  "Salt": { en: "Salt", zh: "盐" },
  "Garlic": { en: "Garlic", zh: "大蒜" },
  "Onion": { en: "Onion", zh: "洋葱" },
  "Potato": { en: "Potato", zh: "土豆" },
  "Tomato": { en: "Tomato", zh: "西红柿" },
  "Banana": { en: "Banana", zh: "香蕉" },
  "Cakes": { en: "Cakes", zh: "蛋糕" },
  "Organic Vegetables": { en: "Organic Vegetables", zh: "有机蔬菜" },
  "ORGANIC VEGETABLES": { en: "Organic Vegetables", zh: "有机蔬菜" },
  "Dry Goods / Staples": { en: "Dry Goods / Staples", zh: "干货 / 主食" },
  "DRY GOODS / STAPLES": { en: "Dry Goods / Staples", zh: "干货 / 主食" },
  "Cabbage": { en: "Cabbage", zh: "卷心菜" },
  "Carrot": { en: "Carrot", zh: "胡萝卜" },
  "Cucumber": { en: "Cucumber", zh: "黄瓜" },
  "Spinach": { en: "Spinach", zh: "菠菜" },
  "Broccoli": { en: "Broccoli", zh: "西兰花" },
  "Cauliflower": { en: "Cauliflower", zh: "花椰菜" },
  "Lettuce": { en: "Lettuce", zh: "生菜" },
  "Bell Pepper": { en: "Bell Pepper", zh: "灯笼椒" },
  "Chili": { en: "Chili", zh: "辣椒" },
  "Lemon": { en: "Lemon", zh: "柠檬" },
  "Lime": { en: "Lime", zh: "青柠" },
  "Apple": { en: "Apple", zh: "苹果" },
  "Orange": { en: "Orange", zh: "橙子" },
  "Grapes": { en: "Grapes", zh: "葡萄" },
  "Watermelon": { en: "Watermelon", zh: "西瓜" },
  "Pineapple": { en: "Pineapple", zh: "菠萝" },
  "Mango": { en: "Mango", zh: "芒果" },
  "Papaya": { en: "Papaya", zh: "木瓜" },
  "Coconut": { en: "Coconut", zh: "椰子" },
  "Pear": { en: "Pear", zh: "梨" },
  "Strawberry": { en: "Strawberry", zh: "草莓" },
  "Blueberry": { en: "Blueberry", zh: "蓝莓" },
  "Cheese": { en: "Cheese", zh: "奶酪" },
  "Butter": { en: "Butter", zh: "黄油" },
  "Yogurt": { en: "Yogurt", zh: "酸奶" },
  "Pastry": { en: "Pastry", zh: "点心" },
  "Pork": { en: "Pork", zh: "猪肉" },
  "Lamb": { en: "Lamb", zh: "羊肉" },
  "Shrimp": { en: "Shrimp", zh: "虾" },
  "Crab": { en: "Crab", zh: "螃蟹" },
  "Squid": { en: "Squid", zh: "鱿鱼" },
  "Organic Eggs": { en: "Organic Eggs", zh: "有机鸡蛋" },
  "Noodles": { en: "Noodles", zh: "面条" },
  "Long Bean": { en: "Long Bean", zh: "长豆角" },
  "Flour": { en: "Flour", zh: "面粉" },
  "Frozen Chicken": { en: "Frozen Chicken", zh: "冷冻鸡肉" },
  "Frozen Seafood": { en: "Frozen Seafood", zh: "冷冻海鲜" },
  
  // Categories
  "Vegetables": { en: "Vegetables", zh: "蔬菜" },
  "Meat": { en: "Meat", zh: "肉类" },
  "Seafood": { en: "Seafood", zh: "海鲜" },
  "Dairy": { en: "Dairy", zh: "乳制品" },
  "Bakery": { en: "Bakery", zh: "烘焙" },
  "Dry Goods": { en: "Dry Goods", zh: "干货" },
  "Others": { en: "Others", zh: "其他" },
  
  "kg": { en: "KG", zh: "公斤" },
  "KG": { en: "KG", zh: "公斤" },
  "bundle": { en: "Bundle", zh: "捆" },
  "box": { en: "Box", zh: "箱" },
  "tray": { en: "Tray", zh: "托盘" },
  "TRAY": { en: "Tray", zh: "托盘" },
  "litre": { en: "Litre", zh: "升" },
  "LITRE": { en: "Litre", zh: "升" },
  "loaf": { en: "Loaf", zh: "条" },
  "LOAF": { en: "Loaf", zh: "条" },
  "cake": { en: "Cake", zh: "个" },
  "CAKE": { en: "Cake", zh: "个" },
  "5 KG PACK": { en: "5 KG Pack", zh: "5公斤装" },
  "5 kg pack": { en: "5 KG Pack", zh: "5公斤装" },
  "pack": { en: "Pack", zh: "包" },
  "PACK": { en: "Pack", zh: "包" },
  "g": { en: "G", zh: "克" },
  "piece": { en: "Piece", zh: "个" },
  "pkt": { en: "Pkt", zh: "包" },
  "PKT": { en: "Pkt", zh: "包" },
  "unit": { en: "Unit", zh: "单位" },
  "UNIT": { en: "Unit", zh: "单位" },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  td: (item: { name: string, translations?: Record<string, string> } | undefined | null) => string;
  formatDate: (date: Date | number, formatStr: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('app_language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
        // Use a microtask to avoid synchronous setState in effect warning
        Promise.resolve().then(() => setLanguage(savedLang));
      }
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', lang);
    }
  };

  const t = (key: string): string => {
    if (!key) return '';
    const trimmedKey = key.trim();
    
    // 1. Direct match
    if (translations[trimmedKey]) {
      return translations[trimmedKey][language] || translations[trimmedKey]['en'];
    }
    
    // 2. Case-insensitive match
    const lowerKey = trimmedKey.toLowerCase();
    const foundKey = Object.keys(translations).find(k => k.toLowerCase() === lowerKey);
    if (foundKey) {
      return translations[foundKey][language] || translations[foundKey]['en'];
    }

    // 3. Fallback
    return key;
  };

  const formatDate = (date: Date | number, formatStr: string): string => {
    const locale = language === 'zh' ? zhCN : enUS;
    return format(date, formatStr, { locale });
  };

  const td = (item: { name: string, translations?: Record<string, string> } | undefined | null): string => {
    if (!item) return '';
    if (item.translations && item.translations[language]) {
      return item.translations[language];
    }
    // Fallback to the hardcoded dictionary if no dynamic translation exists
    return t(item.name);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, td, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
