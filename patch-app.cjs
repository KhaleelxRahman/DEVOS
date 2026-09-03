const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace App component
const newApp = `
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <Routes>
              {/* Public Pages */}
              <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
              <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
              <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
              <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
              <Route path="/docs" element={<PublicLayout><DocsPage /></PublicLayout>} />

              {/* SaaS App Pages */}
              <Route path="/app/*" element={
                <AppLayout>
                  <Routes>
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="workspace" element={<WorkspacePage />} />
                    <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
                  </Routes>
                </AppLayout>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};
`;

code = code.replace(/export const App: React\.FC = \(\) => \{[\s\S]*?\};\n/, newApp);

// Add imports
const importsToAdd = `
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { FAQPage } from './pages/public/FAQPage';
import { ContactPage } from './pages/public/ContactPage';
import { DocsPage } from './pages/public/DocsPage';
import { PublicLayout } from './components/public/PublicLayout';
`;

code = code.replace("import { DashboardPage }", importsToAdd + "import { DashboardPage }");

fs.writeFileSync('src/App.tsx', code);
