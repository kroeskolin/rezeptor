import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import RecipeList from './components/RecipeList'
import RecipeDetail from './components/RecipeDetail'
import AddRecipe from './components/AddRecipe'
import EditRecipe from './components/EditRecipe'
import CookMode from './components/CookMode'
import Community from './components/Community'
import { getAllRecipes, toggleFavorite, backupAllToCloud, startRecipeSync, startTagSync, ensurePaletteFromRecipes } from './db/recipes'
import Settings from './components/Settings'
import TodayTab from './components/TodayTab'
import LuckyWheel from './components/LuckyWheel'
import RecipeTinder from './components/RecipeTinder'
import IngredientSuggest from './components/IngredientSuggest'
import SearchDrawer from './components/SearchDrawer'
import { loadTheme, syncThemeFromCloud } from './useTheme'
import SplashScreen from './components/SplashScreen'
import { decompressFromEncodedURIComponent } from 'lz-string'
import { addRecipe } from './db/recipes'
import { useAuth } from './contexts/AuthContext'
import { getActivities, getSharedRecipe } from './db/community'

loadTheme()

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [showAddRecipe, setShowAddRecipe] = useState(false)
  const [showEditRecipe, setShowEditRecipe] = useState(false)
  const [showCookMode, setShowCookMode] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [todayMode, setTodayMode] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [isOnMainPage, setIsOnMainPage] = useState(true)
  const [importRecipe, setImportRecipe] = useState(null)

  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [lastSeen, setLastSeen] = useState(0)

  const seenKey = user ? `rezeptor_activitySeen_${user.uid}` : null

  useEffect(() => {
    getAllRecipes().then(setRecipes)
  }, [])

  // Editier-Flag für den Auto-Reload: nicht reloaden, während ein Rezept bearbeitet wird
  useEffect(() => {
    const editing = showAddRecipe || showEditRecipe
    window.__rezeptorEditing = editing
    if (!editing && window.__rezeptorPendingReload) {
      window.__rezeptorPendingReload = false
      window.location.reload()
    }
  }, [showAddRecipe, showEditRecipe])

  // Live-Sync: Cloud-Rezepte/Tags/Theme in die lokale DB übernehmen, sobald eingeloggt
  useEffect(() => {
    if (!user) return
    syncThemeFromCloud() // am Konto gespeichertes Farbschema übernehmen
    const unsubR = startRecipeSync(() => getAllRecipes().then(setRecipes))
    const unsubT = startTagSync(() => window.dispatchEvent(new Event('rezeptor:tags-updated')))
    return () => { unsubR(); unsubT() }
  }, [user])

  // Aktivitäten laden, sobald ein Nutzer eingeloggt ist (und beim Wiederanzeigen der App)
  useEffect(() => {
    if (!user) { setActivities([]); setLastSeen(0); return }
    // Einmaliges Cloud-Backup der lokalen Rezepte (Phase 2a; idempotent pro Gerät),
    // danach Tag-Palette aus den Rezept-Tags ableiten (damit Tags ans Konto wandern)
    backupAllToCloud()
      .then(() => ensurePaletteFromRecipes())
      .catch(err => console.error('Cloud-Backup/Palette:', err))
    setLastSeen(Number(localStorage.getItem(`rezeptor_activitySeen_${user.uid}`) || 0))
    const load = () => getActivities(user).then(setActivities).catch(err => console.error('Aktivitäten laden fehlgeschlagen:', err))
    load()
    const onVisible = () => { if (!document.hidden) load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user])

  const unreadCount = activities.filter(a => a.createdAtMs > lastSeen).length

  const markActivitiesSeen = () => {
    if (!seenKey) return
    const now = Date.now()
    localStorage.setItem(seenKey, String(now))
    setLastSeen(now)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedUrl = params.get('url')
    const sharedText = params.get('text')
    if (sharedUrl || sharedText) {
      const url = sharedUrl || sharedText
      if (url.startsWith('http')) {
        setShowAddRecipe(true)
        setIsOnMainPage(false)
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#import=')) {
      // Alter Langlink (Rezept komprimiert in der URL) – weiter unterstützt
      try {
        const compressed = hash.slice('#import='.length)
        const json = decompressFromEncodedURIComponent(compressed)
        const recipe = JSON.parse(json)
        if (recipe && recipe.title) {
          setImportRecipe(recipe)
          setIsOnMainPage(false)
        }
      } catch (e) {
        console.error('Import-Link konnte nicht gelesen werden:', e)
      }
      window.history.replaceState({}, '', window.location.pathname)
    } else if (hash.startsWith('#s=')) {
      // Neuer Kurzlink – Rezept per ID aus Firestore laden
      const id = hash.slice('#s='.length)
      window.history.replaceState({}, '', window.location.pathname)
      getSharedRecipe(id)
        .then((recipe) => {
          if (recipe && recipe.title) {
            setImportRecipe(recipe)
            setIsOnMainPage(false)
          } else {
            alert('Dieses geteilte Rezept wurde nicht gefunden.')
          }
        })
        .catch((e) => console.error('Kurzlink konnte nicht geladen werden:', e))
    }
  }, [])

  const goToMainPage = () => setIsOnMainPage(true)
  const goToSubPage = () => setIsOnMainPage(false)

  const handleSave = async () => {
    const updated = await getAllRecipes()
    setRecipes(updated)
    setShowAddRecipe(false)
    goToMainPage()
  }

  const handleDelete = async () => {
    const updated = await getAllRecipes()
    setRecipes(updated)
    setSelectedRecipe(null)
    goToMainPage()
  }

  const handleUpdate = async () => {
    const updated = await getAllRecipes()
    setRecipes(updated)
    const refreshed = updated.find(r => r.id === selectedRecipe?.id)
    setSelectedRecipe(refreshed || null)
    setShowEditRecipe(false)
    goToSubPage() // terug naar detail
  }

  const handleToggleFavorite = async (recipe) => {
    await toggleFavorite(recipe)
    const updated = await getAllRecipes()
    setRecipes(updated)
    if (selectedRecipe?.id === recipe.id) {
      const refreshed = updated.find(r => r.id === recipe.id)
      setSelectedRecipe(refreshed || null)
    }
  }

  const renderContent = () => {
    if (importRecipe) {
      return (
        <div style={{ padding: '60px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h1 className="display" style={{ fontSize: 30, color: 'var(--espresso)', lineHeight: 1.1, fontFamily: 'var(--serif)' }}>
            Rezept <span style={{ fontStyle: 'italic', fontWeight: 600 }}>erhalten</span>
          </h1>
          <div style={{
            background: 'var(--card)', border: '1.5px solid var(--line-2)',
            borderRadius: 16, padding: 18,
          }}>
            {importRecipe.image && (
              <img src={importRecipe.image} alt=""
                style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 14, display: 'block' }} />
            )}
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 19, color: 'var(--espresso)' }}>
              {importRecipe.title}
            </div>
            {importRecipe.subtitle && (
              <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--mute)', fontStyle: 'italic', marginTop: 4 }}>
                {importRecipe.subtitle}
              </div>
            )}
            <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, color: 'var(--cocoa)', marginTop: 8 }}>
              {importRecipe.ingredients?.length || 0} Zutaten
              {(importRecipe.prepTime || importRecipe.cookTime) ? ` · ${(importRecipe.prepTime || 0) + (importRecipe.cookTime || 0)} Min.` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={async () => {
                await addRecipe({
                  title: importRecipe.title || '',
                  subtitle: importRecipe.subtitle || '',
                  servings: Number(importRecipe.servings) || 0,
                  prepTime: Number(importRecipe.prepTime) || 0,
                  cookTime: Number(importRecipe.cookTime) || 0,
                  ingredients: importRecipe.ingredients || [],
                  steps: importRecipe.steps || '',
                  tags: importRecipe.tags || [],
                  source: importRecipe.source || 'Geteilt via Rezeptor',
                  image: importRecipe.image || null,
                })
                setImportRecipe(null)
                await handleSave()
              }}
              style={{
                background: 'var(--green)', color: 'var(--paper)', border: 'none',
                borderRadius: 14, padding: '15px', fontSize: 16, fontWeight: 700,
                fontFamily: 'var(--serif)', cursor: 'pointer',
              }}>
              Rezept importieren
            </button>
            <button
              onClick={() => { setImportRecipe(null); goToMainPage() }}
              style={{
                background: 'var(--card)', color: 'var(--cocoa)', border: '1px solid var(--line-2)',
                borderRadius: 14, padding: '15px', fontSize: 15,
                fontFamily: 'var(--serif)', cursor: 'pointer',
              }}>
              Abbrechen
            </button>
          </div>
        </div>
      )
    }

    if (showAddRecipe) {
      return <AddRecipe onSave={handleSave} onClose={() => { setShowAddRecipe(false); goToMainPage() }} />
    }
    if (showEditRecipe && selectedRecipe) {
      return <EditRecipe
        recipe={selectedRecipe}
        onSave={handleUpdate}
        onClose={() => { setShowEditRecipe(false); goToSubPage() }}
        onDelete={handleDelete}
      />
    }
    if (showSearch) {
      return (
        <SearchDrawer
          recipes={recipes}
          onSelectRecipe={(r) => { setSelectedRecipe(r); setShowSearch(false); goToSubPage() }}
          onClose={() => { setShowSearch(false); goToMainPage() }}
        />
      )
    }
    if (selectedRecipe) {
      return (
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={() => { setSelectedRecipe(null); goToMainPage() }}
          onEdit={() => { setShowEditRecipe(true); goToSubPage() }}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onStartCook={() => setShowCookMode(true)}
          onToggleFavorite={handleToggleFavorite}
        />
      )
    }

    switch (activeTab) {
      case 'home':
        return <RecipeList recipes={recipes} onSelectRecipe={(r) => { setSelectedRecipe(r); goToSubPage() }}
          onToggleFavorite={handleToggleFavorite} favOnly={favOnly} />
      case 'today':
        if (todayMode === 'wheel') return <LuckyWheel recipes={recipes}
          onSelectRecipe={(r) => { setSelectedRecipe(r); goToSubPage() }}
          onBack={() => { setTodayMode(null); goToMainPage() }} />
        if (todayMode === 'tinder') return <RecipeTinder recipes={recipes}
          onSelectRecipe={(r) => { setSelectedRecipe(r); goToSubPage() }}
          onBack={() => { setTodayMode(null); goToMainPage() }} />
        if (todayMode === 'ingredients') return <IngredientSuggest recipes={recipes}
          onSelectRecipe={(r) => { setSelectedRecipe(r); goToSubPage() }}
          onBack={() => { setTodayMode(null); goToMainPage() }} />
        return <TodayTab onSelectMode={(mode) => { setTodayMode(mode); goToSubPage() }} />
      case 'community':
        return <Community
          recipes={recipes}
          onLocalSave={handleSave}
          activities={activities}
          unreadCount={unreadCount}
          lastSeen={lastSeen}
          onSeen={markActivitiesSeen}
        />
      case 'settings':
        return <Settings
          onImport={handleSave}
          onExport={() => { }}
          onShowTagManager={goToSubPage}
          onHideTagManager={goToMainPage}
        />
      default:
        return <RecipeList recipes={recipes} onSelectRecipe={(r) => { setSelectedRecipe(r); goToSubPage() }}
          onToggleFavorite={handleToggleFavorite} favOnly={favOnly} />
    }
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        communityBadge={unreadCount}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setTodayMode(null)
          setSelectedRecipe(null)
          setShowSearch(false)
          setFavOnly(false)
          goToMainPage()
        }}
        onFabClick={() => { setShowAddRecipe(true); goToSubPage() }}
        hideNav={!isOnMainPage || showSplash}
        onFavClick={() => setFavOnly(v => !v)}
        favActive={favOnly}
        onSearchClick={() => { setShowSearch(true); goToSubPage() }}
      >
        {renderContent()}
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </Layout>

      {showCookMode && selectedRecipe && (
        <CookMode recipe={selectedRecipe} onClose={() => setShowCookMode(false)} />
      )}
    </>
  )
}

export default App
