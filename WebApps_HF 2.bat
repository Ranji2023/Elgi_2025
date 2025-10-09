@echo off
set "LOG_FILE=D:\FD_04\WebappsHF.txt"
set "DSY_ENOVIA_INSTALLER=D:\FD_04\DS_Installer.Windows64"

echo ENOVIA Installation Log Started on %DATE% at %TIME% > "%LOG_FILE%"
echo. >> "%LOG_FILE%"
echo ------------------------------------------------------------------------ >> "%LOG_FILE%"

:: Section 1: 3DExplore
echo Installing 3DExplore...
"D:\FD_04\webapps_seg\3DExplore.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\3DExplore\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo 3DExplore: SUCCESS
    echo 3DExplore: SUCCESS >> "%LOG_FILE%"
) else (
    echo 3DExplore: FAILED!
    echo 3DExplore: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 2: ENOVIACollaborativeTasksFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIACollaborativeTasksFoundation...
"D:\FD_04\webapps_seg\ENOVIACollaborativeTasksFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIACollaborativeTasksFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIACollaborativeTasksFoundation: SUCCESS
    echo ENOVIACollaborativeTasksFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIACollaborativeTasksFoundation: FAILED!
    echo ENOVIACollaborativeTasksFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 3: ENOVIAIPClassificationFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAIPClassificationFoundation...
"D:\FD_04\webapps_seg\ENOVIAIPClassificationFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAIPClassificationFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAIPClassificationFoundation: SUCCESS
    echo ENOVIAIPClassificationFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAIPClassificationFoundation: FAILED!
    echo ENOVIAIPClassificationFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 4: ENOVIAEnterpriseChangeManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIAEnterpriseChangeManagement...
"D:\FD_04\webapps_seg\ENOVIAEnterpriseChangeManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAEnterpriseChangeManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAEnterpriseChangeManagement: SUCCESS
    echo ENOVIAEnterpriseChangeManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAEnterpriseChangeManagement: FAILED!
    echo ENOVIAEnterpriseChangeManagement: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 5: ENOVIAProjectManagementFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAProjectManagementFoundation...
"D:\FD_04\webapps_seg\ENOVIAProjectManagementFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAProjectManagementFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAProjectManagementFoundation: SUCCESS
    echo ENOVIAProjectManagementFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAProjectManagementFoundation: FAILED!
    echo ENOVIAProjectManagementFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 6: ENOVIADocumentManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIADocumentManagement...
"D:\FD_04\webapps_seg\ENOVIADocumentManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIADocumentManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIADocumentManagement: SUCCESS
    echo ENOVIADocumentManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIADocumentManagement: FAILED!
    echo ENOVIADocumentManagement: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 7: ENOVIAEngineeringBOMManagementFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAEngineeringBOMManagementFoundation...
"D:\FD_04\webapps_seg\ENOVIAEngineeringBOMManagementFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAEngineeringBOMManagementFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAEngineeringBOMManagementFoundation: SUCCESS
    echo ENOVIAEngineeringBOMManagementFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAEngineeringBOMManagementFoundation: FAILED!
    echo ENOVIAEngineeringBOMManagementFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 8: DataModelCustomizationFoundation
echo. >> "%LOG_FILE%"
echo Installing DataModelCustomizationFoundation...
"D:\FD_04\webapps_seg\DataModelCustomizationFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\DataModelCustomizationFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo DataModelCustomizationFoundation: SUCCESS
    echo DataModelCustomizationFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo DataModelCustomizationFoundation: FAILED!
    echo DataModelCustomizationFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 9: ENOVIAVariantManagementFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAVariantManagementFoundation...
"D:\FD_04\webapps_seg\ENOVIAVariantManagementFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAVariantManagementFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAVariantManagementFoundation: SUCCESS
    echo ENOVIAVariantManagementFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAVariantManagementFoundation: FAILED!
    echo ENOVIAVariantManagementFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 10: ENOVIAConfiguredBOMManagementFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAConfiguredBOMManagementFoundation...
"D:\FD_04\webapps_seg\ENOVIAConfiguredBOMManagementFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAConfiguredBOMManagementFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAConfiguredBOMManagementFoundation: SUCCESS
    echo ENOVIAConfiguredBOMManagementFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAConfiguredBOMManagementFoundation: FAILED!
    echo ENOVIAConfiguredBOMManagementFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 11: ENOVIATraceableRequirementsManagementFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIATraceableRequirementsManagementFoundation...
"D:\FD_04\webapps_seg\ENOVIATraceableRequirementsManagementFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIATraceableRequirementsManagementFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIATraceableRequirementsManagementFoundation: SUCCESS
    echo ENOVIATraceableRequirementsManagementFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIATraceableRequirementsManagementFoundation: FAILED!
    echo ENOVIATraceableRequirementsManagementFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 12: ENOVIAEnterpriseAVLManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIAEnterpriseAVLManagement...
"D:\FD_04\webapps_seg\ENOVIAEnterpriseAVLManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAEnterpriseAVLManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAEnterpriseAVLManagement: SUCCESS
    echo ENOVIAEnterpriseAVLManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAEnterpriseAVLManagement: FAILED!
    echo ENOVIAEnterpriseAVLManagement: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 13: ENOVIAEBOMAVLManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIAEBOMAVLManagement...
"D:\FD_04\webapps_seg\ENOVIAEBOMAVLManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAEBOMAVLManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAEBOMAVLManagement: SUCCESS
    echo ENOVIAEBOMAVLManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAEBOMAVLManagement: FAILED!
    echo ENOVIAEBOMAVLManagement: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 14: ENOVIAX-CADDesignFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIAX-CADDesignFoundation...
"D:\FD_04\webapps_seg\ENOVIAX-CADDesignFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAX-CADDesignFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAX-CADDesignFoundation: SUCCESS
    echo ENOVIAX-CADDesignFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAX-CADDesignFoundation: FAILED!
    echo ENOVIAX-CADDesignFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 15: ENOVIADocumentControlFoundation
echo. >> "%LOG_FILE%"
echo Installing ENOVIADocumentControlFoundation...
"D:\FD_04\webapps_seg\ENOVIADocumentControlFoundation.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIADocumentControlFoundation\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIADocumentControlFoundation: SUCCESS
    echo ENOVIADocumentControlFoundation: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIADocumentControlFoundation: FAILED!
    echo ENOVIADocumentControlFoundation: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 16: ENOVIAIntegrationExchangeFramework
echo. >> "%LOG_FILE%"
echo Installing ENOVIAIntegrationExchangeFramework...
"D:\FD_04\webapps_seg\ENOVIAIntegrationExchangeFramework.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAIntegrationExchangeFramework\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAIntegrationExchangeFramework: SUCCESS
    echo ENOVIAIntegrationExchangeFramework: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAIntegrationExchangeFramework: FAILED!
    echo ENOVIAIntegrationExchangeFramework: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 17: ENOVIAUnifiedX-CADDesignManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIAUnifiedX-CADDesignManagement...
"D:\FD_04\webapps_seg\ENOVIAUnifiedX-CADDesignManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIAUnifiedX-CADDesignManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIAUnifiedX-CADDesignManagement: SUCCESS
    echo ENOVIAUnifiedX-CADDesignManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIAUnifiedX-CADDesignManagement: FAILED!
    echo ENOVIAUnifiedX-CADDesignManagement: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 18: ENOVIACollaborationforMicrosoftServer
echo. >> "%LOG_FILE%"
echo Installing ENOVIACollaborationforMicrosoftServer...
"D:\FD_04\webapps_seg\ENOVIACollaborationforMicrosoftServer.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIACollaborationforMicrosoftServer\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIACollaborationforMicrosoftServer: SUCCESS
    echo ENOVIACollaborationforMicrosoftServer: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIACollaborationforMicrosoftServer: FAILED!
    echo ENOVIACollaborationforMicrosoftServer: FAILED! >> "%LOG_FILE%"
)
TIMEOUT /T 15

:: Section 19: ENOVIASupplierItemManagement
echo. >> "%LOG_FILE%"
echo Installing ENOVIASupplierItemManagement...
"D:\FD_04\webapps_seg\ENOVIASupplierItemManagement.Windows64\1\StartTUI.exe" --silent "D:\FD_04\WebappsGA\ENOVIASupplierItemManagement\UserIntentions_CODE_427.4.xml" >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% equ 0 (
    echo ENOVIASupplierItemManagement: SUCCESS
    echo ENOVIASupplierItemManagement: SUCCESS >> "%LOG_FILE%"
) else (
    echo ENOVIASupplierItemManagement: FAILED!
    echo ENOVIASupplierItemManagement: FAILED! >> "%LOG_FILE%"
)

echo. >> "%LOG_FILE%"
echo ------------------------------------------------------------------------ >> "%LOG_FILE%"
echo Installation script finished on %DATE% at %TIME%. >> "%LOG_FILE%"