import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import RecipeList from './components/RecipeList'
import RecipeDetail from './components/RecipeDetail'
import AddRecipe from './components/AddRecipe'
import EditRecipe from './components/EditRecipe'
import CookMode from './components/CookMode'
import Community from './components/Community'
import { getAllRecipes, toggleFavorite } from './db/recipes'
import Settings from './components/Settings'
import TodayTab from './components/TodayTab'
import LuckyWheel from './components/LuckyWheel'
import RecipeTinder from './components/RecipeTinder'
import IngredientSuggest from './components/IngredientSuggest'
import SearchDrawer from './components/SearchDrawer'
import { loadTheme } from './useTheme'
import SplashScreen from './components/SplashScreen'

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

  useEffect(() => {
    getAllRecipes().then(setRecipes)
  }, [])

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
        return <Community recipes={recipes} />
      case 'settings':
        return <Settings
          onImport={handleSave}
          onExport={() => {}}
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
        onTabChange={(tab) => {
          setActiveTab(tab)
          setTodayMode(null)
          setSelectedRecipe(null)
          setShowSearch(false)
          setFavOnly(false)
          goToMainPage()
        }}
        onFabClick={() => { setShowAddRecipe(true); goToSubPage() }}
        hideNav={!isOnMainPage}
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
