"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decrypt } from "../../lib/crypto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { List, Lock, Globe, TrendingUp, Package, LayoutGrid } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const { supabase } = await import("../../lib/supabaseClient");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      // Load lists
      const { data: listsData } = await supabase
        .from("lists")
        .select("*")
        .eq("user_id", user.id);
      setLists(listsData || []);

      // Load all list items (only for public lists - encrypted would need passphrase)
      const { data: itemsData } = await supabase
        .from("list_items")
        .select("*, lists(name, is_encrypted)")
        .eq("user_id", user.id);
      
      // Only decrypt items from public lists
      const decryptedItems = (itemsData || [])
        .filter((item) => !item.lists?.is_encrypted)
        .map((item) => ({
          ...item,
          name: decrypt(item.name),
        }));
      setAllItems(decryptedItems);

      // Load recipes
      const { data: recipesData } = await supabase
        .from("recipes")
        .select("id, title, cook_time")
        .eq("user_id", user.id);
      setRecipes(recipesData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const totalLists = lists.length;
    const publicLists = lists.filter((l) => !l.is_encrypted).length;
    const encryptedLists = lists.filter((l) => l.is_encrypted).length;
    const totalItems = allItems.length;
    const totalRecipes = recipes.length;
    
    // Category breakdown
    const categoryMap = {};
    allItems.forEach((item) => {
      const section = item.section || "other";
      categoryMap[section] = (categoryMap[section] || 0) + 1;
    });
    
    const topCategories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity
    const recentLists = [...lists]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);

    return {
      totalLists,
      publicLists,
      encryptedLists,
      totalItems,
      totalRecipes,
      topCategories,
      recentLists,
    };
  }, [lists, allItems, recipes]);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your lists, recipes, and activity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lists</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalLists}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.publicLists} public, {metrics.encryptedLists} encrypted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">List Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Across {metrics.totalLists} list{metrics.totalLists !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recipes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRecipes}</div>
              <p className="text-xs text-muted-foreground">
                In your library
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.topCategories.length}</div>
              <p className="text-xs text-muted-foreground">
                Active categories
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>Items by category (public lists only)</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.topCategories.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No items yet</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topCategories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between gap-2">
                      <span className="capitalize text-sm font-medium shrink-0">{cat.name}</span>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-2 flex-1 min-w-0 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(cat.count / metrics.totalItems) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 shrink-0 text-right">{cat.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Lists */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Lists</CardTitle>
              <CardDescription>Recently updated lists</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.recentLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <List className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">No lists yet</p>
                  <Link href="/list">
                    <Button size="sm">Create Your First List</Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {metrics.recentLists.map((list) => (
                    <li key={list.id}>
                      <Link href={`/list/${list.id}`}>
                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            {list.is_encrypted ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                            {list.is_encrypted ? "Encrypted List" : list.name}
                            {list.year && !list.is_encrypted && (
                              <span className="ml-1 text-muted-foreground">({list.year})</span>
                            )}
                          </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(list.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/list">
              <Button variant="outline">
                <List className="mr-2 h-4 w-4" />
                View All Lists
              </Button>
            </Link>
            <Link href="/recipes">
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Browse Recipes
              </Button>
            </Link>
            <Link href="/meal-planner">
              <Button variant="outline">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Plan Meals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
