import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from '@utils/toast.jsx'

// Components
import Header from '@components/Header'
import Footer from '@components/Footer'
import HeroSection from '@components/HeroSection'
import InfoSection from '@components/InfoSection'
import ServicesSection from '@components/ServicesSection'
import CTASection from '@components/CTASection'
import AboutSection from '@components/AboutSection'
import Accordion from '@components/Accordion'
import RewiewsSection from '@components/rewiewsSection'
import RewiewsPage from '@components/rewiews_page'
import ContactSection from '@components/ContactSection'
import NotFoundPage from '@components/NotFoundPage'

// Auth Pages
import LoginPage from '@components/auth/modal/login'
import RegisterPage from '@components/auth/modal/register'
import VerifyEmailPage from '@components/auth/modal/verify-email'
import Dashboard from '@components/Dashboard'
import PublicProfilePage from '@components/Dashboard/PublicProfilePage.jsx'
import LeaderboardPage from '@components/LeaderboardPage'
import BannedPage from '@components/BannedPage/BannedPage.jsx'

function HomePage() {
  return (
    <div className="App">
      <Header />

      <main className="main-content">
        <HeroSection />
        <InfoSection />
        <ServicesSection />
        <div className="clear-space-50px"></div>
        <CTASection />
        <div className="clear-space-50px"></div>
        <AboutSection />
        <section className="accordion-section">
          <div className="container">
            <Accordion />
          </div>
        </section>
        <div className="clear-space-50px"></div>
        <RewiewsSection />
        <div className="clear-space-50px"></div>
        <ContactSection />
        <div className="clear-space-50px"></div>
      </main>

      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/profile/:username" element={<PublicProfilePage />} />
          <Route path="/banned" element={<BannedPage />} />
          <Route path="/reviews" element={<RewiewsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
