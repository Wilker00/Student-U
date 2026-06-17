# Migrates inline onclick handlers to data-action attributes in HTML/JS templates.
param(
  [string[]]$Paths = @(
    "$PSScriptRoot\..\frontend\index.html",
    "$PSScriptRoot\..\frontend\js\profile\views.js"
  )
)

$replacements = @(
  @{ Pattern = 'onclick="switchDashboardSubTab\(''([^'']+)''\)"'; Replacement = 'data-action="switchDashboardSubTab" data-subtab-target="$1"' },
  @{ Pattern = 'onclick="switchClassesSubView\(''([^'']+)''\)"'; Replacement = 'data-action="switchClassesSubView" data-class-view="$1"' },
  @{ Pattern = 'onclick="switchTab\(''([^'']+)''\)"'; Replacement = 'data-action="switchTab" data-tab-target="$1"' },
  @{ Pattern = 'onclick="switchDayTab\(this,''([^'']+)''\)"'; Replacement = 'data-action="switchDayTab" data-day="$1"' },
  @{ Pattern = 'onclick="startSpecificPlannedSession\(''([^'']+)''\)"'; Replacement = 'data-action="startSpecificPlannedSession" data-course="$1"' },
  @{ Pattern = 'onclick="openContextualAI\(''([^'']+)''\)"'; Replacement = 'data-action="openAI" data-prompt="$1"' },
  @{ Pattern = 'onclick="focusClassMaterial\(''([^'']+)''\)"'; Replacement = 'data-action="focusClassMaterial" data-material-type="$1"' },
  @{ Pattern = 'onclick="markCard\(''([^'']+)''\)"'; Replacement = 'data-action="markCard" data-status="$1"' },
  @{ Pattern = 'onclick="applyHighlight\(''([^'']+)''\)"'; Replacement = 'data-action="applyHighlight" data-color="$1"' },
  @{ Pattern = 'onclick="StudentUChat\.usePrompt\(''([^'']+)''\)"'; Replacement = 'data-action="chatPrompt" data-prompt="$1"' },
  @{ Pattern = 'onclick="selectClassPortfolio\(''([^'']+)''\)"'; Replacement = 'data-action="selectClassPortfolio" data-course-id="$1"' },
  @{ Pattern = 'onclick="switchTab\(''dashboard''\); switchDashboardSubTab\(''planner''\)"'; Replacement = 'data-action="planNextReview"' },
  @{ Pattern = 'onclick="loadSelectedClassPacket\(\); switchTab\(''workspace''\)"'; Replacement = 'data-action="loadPacketAndWorkspace"' },
  @{ Pattern = 'onclick="drillWeakSpots\(\)"'; Replacement = 'data-action="drillWeakSpots"' },
  @{ Pattern = 'onclick="rescheduleReminders\(\)"'; Replacement = 'data-action="rescheduleReminders"' },
  @{ Pattern = 'onclick="openUpgradeModal\(\)"'; Replacement = 'data-action="openUpgradeModal"' },
  @{ Pattern = 'onclick="closeUpgradeModal\(\)"'; Replacement = 'data-action="closeUpgradeModal"' },
  @{ Pattern = 'onclick="simulateStripeCheckout\(\)"'; Replacement = 'data-action="simulateStripeCheckout"' },
  @{ Pattern = 'onclick="signInWithGoogle\(\)"'; Replacement = 'data-action="signIn"' },
  @{ Pattern = 'onclick="signOut\(\)"'; Replacement = 'data-action="signOut"' },
  @{ Pattern = 'onclick="openVerificationModal\(\)"'; Replacement = 'data-action="verifyStudent"' },
  @{ Pattern = 'onclick="closeVerificationModal\(\)"'; Replacement = 'data-action="closeVerificationModal"' },
  @{ Pattern = 'onclick="submitAcademicVerification\(\)"'; Replacement = 'data-action="submitVerification"' },
  @{ Pattern = 'onclick="exportActiveClassData\(\)"'; Replacement = 'data-action="exportActiveClassData"' },
  @{ Pattern = 'onclick="clearActiveClassMaterials\(\)"'; Replacement = 'data-action="clearActiveClassMaterials"' },
  @{ Pattern = 'onclick="clearAllClassStudyData\(\)"'; Replacement = 'data-action="clearAllClassStudyData"' },
  @{ Pattern = 'onclick="continuePreviousSession\(\)"'; Replacement = 'data-action="continuePreviousSession"' },
  @{ Pattern = 'onclick="focusStudyInput\(\)"'; Replacement = 'data-action="focusStudyInput"' },
  @{ Pattern = 'onclick="startSetupFlow\(\)"'; Replacement = 'data-action="startSetupFlow"' },
  @{ Pattern = 'onclick="dismissOnboardingGate\(\)"'; Replacement = 'data-action="dismissOnboardingGate"' },
  @{ Pattern = 'onclick="loadSelectedClassPacket\(\)"'; Replacement = 'data-action="loadSelectedClassPacket"' },
  @{ Pattern = 'onclick="closeQuiz\(\)"'; Replacement = 'data-action="closeQuiz"' },
  @{ Pattern = 'onclick="advanceQuiz\(\)"'; Replacement = 'data-action="advanceQuiz"' },
  @{ Pattern = 'onclick="toggleSessionTimer\(\)"'; Replacement = 'data-action="toggleSessionTimer"' },
  @{ Pattern = 'onclick="takeBreak\(\)"'; Replacement = 'data-action="takeBreak"' },
  @{ Pattern = 'onclick="returnToSetupPane\(\)"'; Replacement = 'data-action="returnToSetupPane"' },
  @{ Pattern = 'onclick="prevCard\(\)"'; Replacement = 'data-action="prevCard"' },
  @{ Pattern = 'onclick="nextCard\(\)"'; Replacement = 'data-action="nextCard"' },
  @{ Pattern = 'onclick="hideHighlightToolbar\(\)"'; Replacement = 'data-action="hideHighlightToolbar"' },
  @{ Pattern = 'onclick="dismissRecallCheckpoint\(\)"'; Replacement = 'data-action="dismissRecallCheckpoint"' },
  @{ Pattern = 'onclick="skipBreak\(\)"'; Replacement = 'data-action="skipBreak"' },
  @{ Pattern = 'onclick="startReviewQueue\(\)"'; Replacement = 'data-action="startReviewQueue"' },
  @{ Pattern = 'onclick="startPracticeFromActiveClass\(\)"'; Replacement = 'data-action="startPracticeFromActiveClass"' },
  @{ Pattern = 'onclick="createClassPortfolio\(\)"'; Replacement = 'data-action="createClassPortfolio"' },
  @{ Pattern = 'onclick="addClassMaterial\(\)"'; Replacement = 'data-action="addClassMaterial"' },
  @{ Pattern = 'onclick="saveClassSetupDetails\(\)"'; Replacement = 'data-action="saveClassSetupDetails"' },
  @{ Pattern = 'onclick="generateStudyPlanForActiveClass\(\)"'; Replacement = 'data-action="generateStudyPlan"' },
  @{ Pattern = 'onclick="StudentUChat\.send\(\)"'; Replacement = 'data-action="chatSend"' }
)

foreach ($path in $Paths) {
  if (-not (Test-Path $path)) { continue }
  $content = Get-Content $path -Raw -Encoding UTF8
  foreach ($rule in $replacements) {
    $content = [regex]::Replace($content, $rule.Pattern, $rule.Replacement)
  }
  Set-Content $path $content -Encoding UTF8 -NoNewline
  Write-Output "Migrated: $path"
}
