var strLibOID 		=	null;
var classTPLOID		= 	null;
var classNonStdOID	= 	null;
var bookMarkID		=	null;
var csrfToken		=	null;
var classToClassifyOID;
var attrDetails		=	null;
var classAttributesName		=	null;
var classNonStdAttributesName	=	null;
(function setupGlobalLabelResize() {
    let isResizing = false;

    document.addEventListener("mousedown", (e) => {
        // detect drag area near the right edge of any label
        if (
            e.target.classList.contains("YATG_formLabel") &&
            e.offsetX > e.target.clientWidth - 8
        ) {
            isResizing = true;
            document.body.style.cursor = "ew-resize";
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;
        const newWidth = Math.min(Math.max(e.clientX, 100), 500); // between 100px and 500px
        document.documentElement.style.setProperty("--label-width", newWidth + "px");
    });

    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = "default";
        }
    });
})();
define("DS/YATGDesignPhilosophy/YATGDesignPhilosophy", [
    "UWA/Class",
    "DS/WAFData/WAFData",
    "DS/YATGUtilsServices/YATGUtilsServices",
    "text!DS/YATGDesignPhilosophy/assets/YATGIconsPath.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/IDCard.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/BodyContainer.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/TableCavity.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/TableCTLO.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/TableMaterial.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/TablePattern.json",
    "text!DS/YATGDesignPhilosophy/assets/templates/AttributesInfo.json",
    "text!DS/YATGUtilsServices/assets/YATG_Webservices.json",
    "DS/DataDragAndDrop/DataDragAndDrop",
    "DS/YATGRMUtilsServices/UtilService",
	"Solize/View/Loader/NewChooser",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/AirEndClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/RACClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/DPSACClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/OFSACClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/EPSACClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/RLYClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/DryerClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/JORCClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/classDefinition/VaccumPumpsClassJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/templates/defaultAttributesJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/templates/customConfigJSON.json",
	"text!DS/YATGDesignPhilosophy/assets/templates/ClassMappingJSON.json",
	"DS/i3DXCompassServices/i3DXCompassServices",
    "css!DS/YATGDesignPhilosophy/css/YATGDesignPhilosophy",
    "css!DS/YATGDesignPhilosophy/css/YATGDSPIDCard",
    "css!DS/YATGDesignPhilosophy/css/YATGDSPBody"
], function (Class, WAFData, ServiceUtil, IconsPath, IDCard, ContainerBody, TableCavity, TableCTLO, TableMaterial, TablePattern, AttributesInfo, WebServices, DataDnD, YATGUtils, NewChooser, AirEndClassJSON, RACClassJSON, DPSACClassJSON, OFSACClassJSON, EPSACClassJSON, RLYClassJSON, DryerClassJSON, JORCClassJSON, VaccumPumpsClassJSON, defaultAttributesJSON,customConfigJSON,ClassMappingJSON,i3DXCompassServices) {

	const defaultAttrJSON 		  = JSON.parse(defaultAttributesJSON);
	const customConfigurationJSON = JSON.parse(customConfigJSON);
	const classMapJSON 			  = JSON.parse(ClassMappingJSON);
    // -----------------------------------------------------------
    //  TableRenderer Class Definition
    // -----------------------------------------------------------

    var TableRenderer = Class.extend({
        init: function (config) {
            this.tableTemplate = config.tableTemplate;
            this.gridElement = config.gridElement;
            this.saveBtn = config.saveBtn;
            this.cancelBtn = config.cancelBtn;

            this.expandedParents = new Set();
            this.fieldRefs = [];

            if (!this.gridElement) {
                console.error("Grid element not found.", {
                    expectedGridID: this.tableTemplate.gridID
                });
                return;
            }

            this.nonParamHeaders = this.tableTemplate.Header.filter(h => h.label !== "Parameter");
            this.columnsToCenter = this.nonParamHeaders.filter(h => h.label !== "Remarks").map(h => h.label);

            this.gridElement.innerHTML = '';
            this.gridElement.style.display = "grid";
            this.gridElement.style.gridTemplateColumns = `400px 50px repeat(${this.nonParamHeaders.length}, 1fr)`;

            this._renderHeader();
        },

        _handleSearchClick: function (inputId) {
            var self = this;
            const fieldEntry = self._findFieldById(inputId);

            if (!fieldEntry) {
                ServiceUtil._displayNotification("error", "Search failed", "No matching field found for " + inputId);
                return;
            }

            // Extract the actual field object
            const [fieldKey, fieldObject] = Object.entries(fieldEntry)[0];

            self._buildClassOptions(fieldObject)
                .then(function (classOptions) {
                    return MaterialSearch.showModalTable(classOptions);
                })
                .then(function (selectedValues) {
                    console.log("Final selected values:", selectedValues);
                    ServiceUtil._displayNotification("info", "Selected Items", selectedValues.join(", "));
                    const requestedField = document.getElementById(inputId);
                    if (requestedField) {
                        requestedField.value = selectedValues.join(", ");
                    }
                })
                .catch(function (error) {
                    ServiceUtil._displayNotification("error", "Search cancelled", error.message);
                });
        },

        _buildClassOptions: function (fieldObject) {
            var self = this;
            if (!fieldObject || !fieldObject.id || !fieldObject.ClassId) return Promise.resolve([]);

            const classIds = fieldObject.ClassId.split(",").map(id => id.trim());
            const isMultiSelection = fieldObject.isMultiSelection || false;
            const returnAttr = fieldObject.returnAttribute || "id";

            // Build promises for each classId → fetch name
            const promises = classIds.map(classId =>
                self._fetchClassNameById(classId).then(name => ({
                    id: classId,
                    name: name, // resolved from API
                    returnAttr: returnAttr,
                    isMultiSelection: isMultiSelection
                }))
            );

            return Promise.all(promises);
        },

        _fetchClassNameById: function (classId) {
            return ServiceUtil.getClassInformation(classId)
                .then(function (response) {
                    if (response && response.member && response.member.length > 0) {
                        return response.member[0].title || response.member[0].name || classId;
                    }
                    return classId;
                })
                .catch(function (error) {
                    console.error("Failed to get Class Information :", error);
                    ServiceUtil._displayNotification("error", "Unable to Get Class Information", error.message);
                    throw error;
                });
        },

        _findFieldById: function (inputID) {
            if (!MaterialTemplate.table) return null;

            for (const row of MaterialTemplate.table) {
                for (const [key, field] of Object.entries(row)) {
                    if (field && typeof field === "object" && field.id === inputID) {
                        return { [key]: field }; // return entry so caller can extract
                    }
                }
            }
            return null;
        },

        // Helper function for creating elements
        _createElement: function (tag, classname, textContent) {
            const el = document.createElement(tag);
            if (classname) el.className = classname;
            if (textContent) el.textContent = textContent;
            return el;
        },

        // Controls the visibility of save/cancel buttons
        _showButtons: function () {
            if (this.saveBtn) this.saveBtn.style.display = "inline-block";
            if (this.cancelBtn) this.cancelBtn.style.display = "inline-block";
        },

        // Manages dependent row visibility based on parent dropdown value
        _updateDependentRowsVisibility: function (parentId, selectedValue) {
            if (!this.expandedParents.has(parentId)) return;

            const dependentRows = this.tableTemplate.table.filter(r => r.dependentAttribute === parentId);
            dependentRows.forEach(depRow => {
                const displayValues = (depRow.DisplayOnValue || '').split(';').map(v => v.trim().toLowerCase());
                const shouldShow = displayValues.includes((selectedValue || '').trim().toLowerCase());
                const dependentElements = this.gridElement.querySelectorAll(`[data-dependent-row-id="${depRow.dependentAttribute}-${depRow.Specification.id}"]`);
                dependentElements.forEach(el => el.classList.toggle('yatg-hidden-row', !shouldShow));
            });
        },

        // Handles the 'plus' button click to expand dependent rows
        _handlePlusButtonClick: function (row, plusButton, minusButton) {
            const dropdownElement = document.getElementById(row.Specification.id);
            if (!dropdownElement) return;

            const selectedValue = dropdownElement.value.trim().toLowerCase();
            var value = dropdownElement.value;
            const hasDisplayValues = this.tableTemplate.table.some(depRow => {
                if (depRow.dependentAttribute === row.Specification.id) {
                    const displayValues = (depRow.DisplayOnValue || '').split(';').map(v => v.trim().toLowerCase());
                    if (displayValues.length === 1 && displayValues[0] === "none") {
                        value = "none";
                        return true;
                    }
                    return displayValues.includes(selectedValue);
                }
                return false;
            });

            if (!hasDisplayValues) {
                ServiceUtil._displayNotification("error", "Invalid Operation !!!", "Please select a valid value before expanding.");
                return;
            }

            this.expandedParents.add(row.Specification.id);
            console.log("Field Value :: ", value);
            this._updateDependentRowsVisibility(row.Specification.id, value);
            plusButton.style.display = 'none';
            minusButton.style.display = 'inline-flex';
            this._showButtons();
        },

        // Handles the 'minus' button click to collapse dependent rows
        _handleMinusButtonClick: function (row, plusButton, minusButton) {
            this.expandedParents.delete(row.Specification.id);
            this.tableTemplate.table.filter(r => r.dependentAttribute === row.Specification.id).forEach(depRow => {
                this.gridElement.querySelectorAll(`[data-dependent-row-id="${depRow.dependentAttribute}-${depRow.Specification.id}"]`).forEach(el => el.classList.add('yatg-hidden-row'));
            });
            minusButton.style.display = 'none';
            plusButton.style.display = 'inline-flex';
            this._showButtons();
        },

        // Renders the table header
        _renderHeader: function () {
            const headerFragment = document.createDocumentFragment();
            headerFragment.appendChild(this._createElement("div", "yatg-grid-header", "Parameter"));
            headerFragment.appendChild(this._createElement("div", "yatg-grid-header", "Actions"));
            this.nonParamHeaders.forEach(header => {
                headerFragment.appendChild(this._createElement("div", header.classname || "yatg-grid-header", header.label || ""));
            });
            this.gridElement.appendChild(headerFragment);
        },

        // Creates the parameter cell for a row
        _createParameterCell: function (row) {
            const paramCell = this._createElement("div", "yatg-grid-cell yatg-param-name", row.Parameter || "");
            if (row.Specification && row.Specification.mandatory) {
                paramCell.appendChild(this._createElement("span", "yatg-required-asterisk", "*"));
            }
            return paramCell;
        },

        // Creates the action cell with plus/minus buttons
        _createActionCell: function (row) {
            const actionCell = this._createElement("div", "yatg-grid-cell yatg-action-cell");
            if (!row.hasPlusBtn) return actionCell;

            const plusButton = this._createElement("button", "yatg-plus-button");
            plusButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>`;
            plusButton.style.display = 'inline-flex';

            const minusButton = this._createElement("button", "yatg-minus-button");
            minusButton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>`;
            minusButton.style.display = 'none';

            plusButton.addEventListener('click', () => this._handlePlusButtonClick(row, plusButton, minusButton));
            minusButton.addEventListener('click', () => this._handleMinusButtonClick(row, plusButton, minusButton));

            actionCell.appendChild(plusButton);
            actionCell.appendChild(minusButton);
            return actionCell;
        },

        // --- Modularized Data Cell Creation Functions ---

        _createRangeSelect: function (fieldConfig, inputId) {
            const optionsHTML = (fieldConfig.ranges || []).map((backendValue, i) => {
                const displayValue = (fieldConfig.rangesNls && fieldConfig.rangesNls[i]) || backendValue;
                const selected = backendValue === fieldConfig.default ? 'selected' : '';
                return `<option value="${backendValue}" ${selected}>${displayValue}</option>`;
            }).join('');
            const select = this._createElement('select', 'yatg-custom-select');
            select.id = inputId;
            if (fieldConfig.editable === false) select.disabled = true;
            select.innerHTML = optionsHTML;
            select.dataset.initialValue = select.value;
            return select;
        },

        _createSearchBoxInput: function (fieldConfig, inputId) {
            const wrapper = this._createElement('div', 'yatg-input-with-button');
            const input = this._createElement('input');
            input.type = fieldConfig.type || 'text';
            input.id = inputId;
            input.value = fieldConfig.default || '';
            if (fieldConfig.editable === false) input.disabled = true;
            if (fieldConfig.mandatory) input.required = true;
            input.dataset.initialValue = input.value;

            const button = this._createElement('button', 'yatg-search-btn');
            button.type = 'button';
            button.style.display = 'none';

            wrapper.appendChild(input);
            wrapper.appendChild(button);
            return wrapper;
        },

        _createStandardInput: function (fieldConfig, inputId) {
            const wrapper = this._createElement('div', 'yatg-input-with-unit');
            const input = this._createElement('input');
            input.type = fieldConfig.type || 'text';
            input.id = inputId;

            const hasDefault = fieldConfig.hasOwnProperty("default") && fieldConfig.default !== undefined && fieldConfig.default !== null;
            const initialText = hasDefault ? `${fieldConfig.default}` : (fieldConfig.editable && fieldConfig.inputtype === "Real" ? "0" : "");
            input.value = fieldConfig.unit ? `${initialText} ${fieldConfig.unit}` : initialText;

            if (fieldConfig.editable === false) input.disabled = true;
            if (fieldConfig.mandatory) input.required = true;
            input.dataset.initialValue = input.value;

            wrapper.appendChild(input);
            return wrapper;
        },

        // Wires up events for the search box input and button
        _wireSearchBoxEvents: function (cell, inputElement, inputId) {
            const searchButton = cell.querySelector(".yatg-search-btn");
            if (!searchButton) return;
            inputElement.addEventListener("focus", () => searchButton.style.display = "block");
            inputElement.addEventListener("blur", () => setTimeout(() => {
                if (document.activeElement !== searchButton) searchButton.style.display = "none";
            }, 100));
            searchButton.addEventListener("click", () => {
                this._handleSearchClick(inputId);
                searchButton.style.display = "block";
                this._showButtons();
            });
            inputElement.addEventListener("input", () => this._showButtons());
            inputElement.addEventListener("change", () => this._showButtons());
        },

        // Wires up events for standard input fields
        _wireStandardInputEvents: function (inputElement, fieldConfig) {
            inputElement.addEventListener("change", () => this._showButtons());
            inputElement.addEventListener("input", () => this._showButtons());
            if (fieldConfig.inputtype === "Real") {
                inputElement.addEventListener("blur", () => {
                    const num = inputElement.value.trim().replace(/[^\d.-]/g, "") || "0";
                    inputElement.value = fieldConfig.unit ? `${num} ${fieldConfig.unit}` : num;
                });
            }
        },

        // Main method for creating data cells
        _createDataCell: function (row, header, rowIndex) {
            const col = header.label;
            const isCenteredColumn = this.columnsToCenter.includes(col);
            const cellClasses = ["yatg-grid-cell"];
            if (col === "Specification") cellClasses.push("yatg-bold-text");
            if (isCenteredColumn) cellClasses.push("yatg-center-text");

            const cell = this._createElement("div", cellClasses.join(" "));
            const fieldConfig = row[col];

            if (!fieldConfig || typeof fieldConfig !== "object") {
                return cell;
            }

            const inputId = fieldConfig.id || `field-${rowIndex}-${col}`;
            let fieldContainer;

            if (fieldConfig.hasRange) {
                fieldContainer = this._createRangeSelect(fieldConfig, inputId);
                this._wireStandardInputEvents(fieldContainer, fieldConfig);
                fieldContainer.addEventListener("change", (e) => this._updateDependentRowsVisibility(inputId, e.target.value));
            } else if (fieldConfig.inputtype === "SearchBox") {
                fieldContainer = this._createSearchBoxInput(fieldConfig, inputId);
                this._wireSearchBoxEvents(fieldContainer, fieldContainer.querySelector('input'), inputId);
            } else {
                fieldContainer = this._createStandardInput(fieldConfig, inputId);
                this._wireStandardInputEvents(fieldContainer.querySelector('input'), fieldConfig);
            }

            cell.appendChild(fieldContainer);
            return cell;
        },

        // The main render method that loops through rows and builds the table
        render: function () {
            (this.tableTemplate.table || []).forEach((row, rowIndex) => {
                const rowDivs = document.createDocumentFragment();
                rowDivs.appendChild(this._createParameterCell(row));
                rowDivs.appendChild(this._createActionCell(row));
                this.nonParamHeaders.forEach(header => {
                    const cell = this._createDataCell(row, header, rowIndex);
                    rowDivs.appendChild(cell);
                    const fieldConfig = row[header.label];
                    if (fieldConfig && typeof fieldConfig === "object") {
                        this.fieldRefs.push({
                            id: fieldConfig.id || `field-${rowIndex}-${header.label}`,
                            hasRange: fieldConfig.hasRange,
                            datatype: fieldConfig.datatype,
                            isMandatory: fieldConfig.mandatory,
                            param: row.Parameter,
                            col: header.label,
                            unit: fieldConfig.unit,
                            editable: fieldConfig.editable
                        });
                    }
                });

                if (row.isHidden) {
                    rowDivs.querySelectorAll("div").forEach(el => {
                        el.classList.add('yatg-hidden-row');
                        el.dataset.dependentRowId = `${row.dependentAttribute}-${row.Specification.id}`;
                    });
                }
                this.gridElement.appendChild(rowDivs);
            });
            return this.fieldRefs;
        }
    });

    // -----------------------------------------------------------
    //  Main Application Class 
    // -----------------------------------------------------------

    const objectId = "290938F7000034CC688F730800054C19";
    var IconsPathJSON = JSON.parse(IconsPath);
    var IDCardTemplate = JSON.parse(IDCard);
    var tabInfo = JSON.parse(ContainerBody);
    var CavityTemplate = JSON.parse(TableCavity);
    var CTLOTemplate = JSON.parse(TableCTLO);
    var MaterialTemplate = JSON.parse(TableMaterial);
    var PatternTemplate = JSON.parse(TablePattern);
    var WebServicesJson = JSON.parse(WebServices);
    var AttributesJson = JSON.parse(AttributesInfo);
    var imagePath = IconsPathJSON.CustomTomEE.path + IconsPathJSON.WidgetLocation.path;
    var PlatformServices = Class.singleton({
        getGlobalVariable: function () {
            return this.GlobalVariable || this.setGlobalVariable(), this.GlobalVariable;
        },
        setGlobalVariable: function () {
            this.GlobalVariable = {
                userId: "",
                SecurityContext: "",
                serviceName: "/3dspace",
                baseURL: "",
                tenant: "",
                get3DSpaceURL: function () {
                    return this.baseURL;
                },
                getSwymURL: function () {
                    return this.swymURL;
                },
                getCompassURL: function () {
                    return this.compassURL;
                },
                computeUrl: function (path) {
                    return this.get3DSpaceURL() + path;
                },
                getSecurityContext: function () {
                    return this.SecurityContext;
                },
                getCurrentUser: function () {
                    return this.userId;
                }
            };
        },
        setBaseURL: function (url) {
            this.getGlobalVariable().baseURL = url;
        },
        setSecurityContext: function (ctx) {
            this.getGlobalVariable().SecurityContext = ctx;
        },
        setUserId: function (id) {
            this.getGlobalVariable().userId = id;
        }
    });

    var Application = {



        initializePlatformServices: function () {
            var current = this;
            console.log("Initializing platform services...");
            return ServiceUtil.retrivePlatformUrl()
                .then(function (platformServices) {
                    var baseUrl = ServiceUtil.getPlatformURL("3DSpace", platformServices);
                    PlatformServices.setBaseURL(baseUrl);
                    console.log("Base URL set:", baseUrl);
                    var user = ServiceUtil.GetCurrentUser();
                    PlatformServices.setUserId(user.login || "");
                    console.log("User set:", user);
                    return ServiceUtil.GetCurrentSecurityContext();
                })
                .then(function (securityContext) {
                    PlatformServices.setSecurityContext(securityContext);
                    console.log("Security Context set:", securityContext);
                    current.globalVariable = PlatformServices.getGlobalVariable();
                    console.log("All platform services initialized", current.globalVariable);
                    return current.globalVariable;
                })
                .catch(function (err) {
                    console.error("Failed to initialize platform services:", err);
                    throw err;
                });
        },

        InitiateApplication: function (objectId) {
            var self = this;
            //widget.body.innerhtml = "";

            var contentArea = document.querySelector(".YATG-widget-content-area");
            contentArea.innerHTML = "";


            const landingPage = self.createElement("div", "yatg-app-container");

            // if (!objectId) {
            //     objectId = "290938F7000034CC688F730800054C19";
            // }

            console.log("Object Id : ", objectId);

            self.getIDCardAttribute(IDCardTemplate, objectId).then(function (IdCardInfo) {
                console.log("ID Card Info : ", IdCardInfo);
                self.initializeIDCardInfo(IdCardInfo.Attributes, landingPage);
            }).then(function () {
                self.initializeDesignPhilosophyBody(landingPage, objectId);
            })

            // self.initializeIDCardInfo("",landingPage);
            // self.initializeDesignPhilosophyBody(landingPage,"");

            //widget.body.appendChild(landingPage);
            contentArea.appendChild(landingPage);
        },
        createElement: function (tag, classList, textContent) {
            const el = document.createElement(tag);
            if (classList) {
                classList.split(/\s+/).forEach(cls => el.classList.add(cls));
            }
            if (textContent) el.textContent = textContent;
            return el;
        },
        initializeIDCardInfo: function (objectInfo, parentContainer) {
            var self = this;
            console.log("ObjectInfo ID Class :: ", objectInfo);
            var idCardContainer = self.createElement("div", "yatg-id-card-container");
            self.createSideBar(idCardContainer);
            self.createThumbnail(idCardContainer, "");
            self.createContentWraper(idCardContainer, objectInfo);
            parentContainer.appendChild(idCardContainer);
        },
        createSideBar: function (parentContainer) {
            var self = this;
            var sideBar = self.createElement("div", "yatg-sidebar");
            var sidebarButtons = self.createElement("div", "yatg.sidebar.buttons");
            var sideBarIcon = self.createElement("div", "yatg.sidebar-icons");
            var imgHome = self.createElement("img", "yatg-sidebar-icons");
            imgHome.src = imagePath + IconsPathJSON.HomeIcon.path;
            imgHome.style.width = "25px";
            imgHome.style.height = "25px";
            sideBarIcon.appendChild(imgHome);
            sidebarButtons.appendChild(sideBarIcon);
            sideBar.appendChild(sidebarButtons);
            parentContainer.appendChild(sideBar);
        },
        createThumbnail: function (parentContainer, thumnailurl) {
            var self = this;
            const iconLocation = IconsPathJSON.ProductThumbnail.path;
            if (!thumnailurl) {
                thumnailurl = imagePath + iconLocation;
            }
            const imagePlaceHolder = self.createElement("div", "yatg-image-placeholder");
            const thumbnail = self.createElement("img", "yatg-thumbnail");
            thumbnail.src = thumnailurl;
            imagePlaceHolder.appendChild(thumbnail);
            parentContainer.appendChild(imagePlaceHolder);
        },
        createContentWraper: function (parentContainer, objectInfo) {
            const self = this;
            const headerContentEl = self.createElement("div", "yatg-content-wrapper");
            const attrMap = Object.fromEntries(objectInfo.map(attr => [attr.name, attr.value || ""]));
            const objectTitle = attrMap["V_Name"] || "";
            const version = attrMap["revision"] || "";
            headerContentEl.appendChild(self.createMainSection(objectTitle, version));
            headerContentEl.appendChild(self.createSubSections(objectInfo));
            parentContainer.appendChild(headerContentEl);
        },
        createMainSection: function (ObjectName, Version) {
            var self = this;
            const mainSectionEl = self.createElement("div", "yatg-title-section");
            var titleEle = self.createElement("span", "yatg-Object-name", ObjectName);
            var versionEle = self.createElement("span", "yatg-Object-Version", Version);
            mainSectionEl.appendChild(titleEle);
            mainSectionEl.appendChild(versionEle);
            return mainSectionEl;
        },
        createSubSections: function (ObjectInfo) {
            const self = this;
            const attributeSectionEl = self.createElement("div", "yatg-sub-section");
            const getValue = name => ObjectInfo.find(attr => attr.name === name)?.value || "";
            for (let i = 0; i < IDCardTemplate.SubSection.attributes.length; i += 3) {
                const subSectionEl = self.createElement("div", "yatg-sub-part");
                IDCardTemplate.SubSection.attributes.slice(i, i + 3).forEach(attr =>
                    subSectionEl.appendChild(self.createAttributeTag(attr.label, getValue(attr.name)))
                );
                attributeSectionEl.appendChild(subSectionEl);
            }
            return attributeSectionEl;
        },
        createAttributeTag: function (label, value) {
            var self = this;
            const attrTag = self.createElement("div", "yatg-attritbute-section");
            const attrName = self.createElement("section", "yatg-attribute-name", label);
            const attrValue = self.createElement("section", "yatg-attribute-value", value);
            const colon = document.createTextNode(" : ");
            attrTag.appendChild(attrName);
            attrTag.appendChild(colon);
            attrTag.appendChild(attrValue);
            return attrTag;
        },
        initializeDesignPhilosophyBody: function (parentContainer, objectId) {
            console.log("Inside design Philosophy body ");
            var self = this;
            const dspBodyContainer = self.createElement("div", "yatg-body-container");
            const tabContainer = self.createElement("div", "yatg-tabs");
            const tabsTemplate = tabInfo.Tabs;
            tabsTemplate.forEach(tab => {
                const input = self.createElement("input");
                input.type = tab.type || "radio";
                input.id = tab.id;
                input.name = tab.name;
                if (tab.default === "true") {
                    input.checked = true;
                }
                tabContainer.appendChild(input);
            });
            const tabsLabelDiv = self.createElement("div", "yatg-tab-labels");
            tabsTemplate.forEach(tab => {
                const label = self.createElement("label");
                label.setAttribute("for", tab.id);
                label.textContent = tab.label;
                tabsLabelDiv.appendChild(label);
            });
            tabContainer.appendChild(tabsLabelDiv);
            var contentContainers = self.createElement("div", "yatg-content");

            self.getEngineeringItemInformation(objectId)
                .then(async function (EngineeringItemInformation) {
                    const InterfaceInformation = await self.getDMCAttributeList();
                    return await self.combineInterfaceAndEngineeringItemInformation(InterfaceInformation, EngineeringItemInformation);
                })
                .then(function (CombinedInformation) {
                    console.log("New Combined Information:", CombinedInformation);
                })
                .catch(function (err) {
                    console.error("Error combining information:", err);
                });

            self.createAndGetTabInformation(contentContainers, "CavitySaveBtn", "CavityCancelBtn", CavityTemplate, objectId);
            self.createAndGetTabInformation(contentContainers, "CTLOSaveBtn", "CTLOCancelBtn", CTLOTemplate, objectId);
            self.createAndGetTabInformation(contentContainers, "PatternSaveBtn", "PatternCancelBtn", PatternTemplate, objectId);
            self.createAndGetTabInformation(contentContainers, "MaterialSaveBtn", "MaterialCancelBtn", MaterialTemplate, objectId);
            tabContainer.appendChild(contentContainers);
            dspBodyContainer.appendChild(tabContainer);
            parentContainer.appendChild(dspBodyContainer);
        },
        createAndGetTabInformation: function (parentContainer, SaveBtnID, CancelBtnID, TableTemplate, objectId) {
            var self = this;
            var TabContent = self.createElement("div", "yatg-tab-content");
            TabContent.id = TableTemplate.id;
            var contentScrollWrapper = self.createElement("div", "yatg-grid-scroll-wrapper");
            var gridContainer = self.createElement("div", "yatg-grid-container");
            gridContainer.id = TableTemplate.gridID;
            var buttonWrapper = self.createElement("div", "yatg-btn-wrapper");
            var SaveButton = self.createElement("button", "yatg-save-btn", "Save");
            SaveButton.id = SaveBtnID;
            SaveButton.style.display = "none";
            var CancelButton = self.createElement("button", "yatg-cancel-btn", "Cancel");
            CancelButton.id = CancelBtnID;
            CancelButton.style.display = "none";
            buttonWrapper.appendChild(SaveButton);
            buttonWrapper.appendChild(CancelButton);
            contentScrollWrapper.appendChild(gridContainer);
            TabContent.appendChild(contentScrollWrapper);
            TabContent.appendChild(buttonWrapper);
            parentContainer.appendChild(TabContent);
            let refs;
            self.getDMCAttributeList()
                .then(function (DMCAttributeInfo) {
                    return self.merageTableTemplateAttributeList(TableTemplate, DMCAttributeInfo);
                })
                .then(function (finalTemplate) {
                    return self.createAttributesFromTableTemplate(TableTemplate, objectId);
                })
                .then(function (AttributeInfo) {
                    return self.mergeResponseWithTemplate(TableTemplate, AttributeInfo);
                })
                .then(function (updatedTemplate) {
                    console.log("UpdateTemplate With Value :: ", updatedTemplate);
                    // Instantiate and render the table using the new class
                    // This is where the TableRenderer is called.
                    const renderer = new TableRenderer({
                        tableTemplate: updatedTemplate,
                        gridElement: gridContainer,
                        saveBtn: SaveButton,
                        cancelBtn: CancelButton
                    });
                    refs = renderer.render();
                })
                .catch(function (error) {
                    console.error("Error merging table template:", error);
                });
            SaveButton.addEventListener("click", () => {
                this.captureTabValues(refs, SaveButton, CancelButton, objectId);
            });
            CancelButton.addEventListener("click", () => {
                this.resetTabValues(refs, TableTemplate, SaveButton, CancelButton);
            });
        },
        merageTableTemplateAttributeList: function (TableTemplate, DMCAttributeInfo) {
            return new Promise(function (resolve) {
                const attributeLookup = {};
                (DMCAttributeInfo.results || []).forEach(result => {
                    (result.interfaces || []).forEach(interfaceObj => {
                        (interfaceObj.attributes || []).forEach(attribute => {
                            attributeLookup[attribute.path] = attribute;
                        });
                    });
                });
                const columnLabels = (TableTemplate.Header || [])
                    .map(headerObj => headerObj.label)
                    .filter(label => label !== "Parameter");
                (TableTemplate.table || []).forEach(row => {
                    columnLabels.forEach(col => {
                        if (row[col] && typeof row[col] === 'object') {
                            const cellConfig = row[col];
                            if (attributeLookup[cellConfig.id]) {
                                const attributeDetails = attributeLookup[cellConfig.id];
                                cellConfig.default = attributeDetails.default || '';
                                cellConfig.unit = attributeDetails.Dimension || '';
                                cellConfig.ranges = attributeDetails.ranges || [];
                                cellConfig.rangesNls = attributeDetails.rangesNls || [];
                                cellConfig.nlsName = attributeDetails.nlsName || '';
                                cellConfig.datatype = attributeDetails.Primitive || 'String';
                                cellConfig.hasRange = attributeDetails.hasRange || false;
                            }
                        }
                    });
                });
                resolve(TableTemplate);
            });
        },
        getIDCardAttribute: function (IDCardAttributes, objectId) {
            const attributes = [];
            IDCardAttributes.MainSection.attributes.forEach(attr => {
                attributes.push({
                    name: attr.name
                });
            });
            IDCardAttributes.SubSection.attributes.forEach(attr => {
                attributes.push({
                    name: attr.name
                });
            });
            return new Promise(function (resolve, reject) {
                var request = {
                    data: {
                        objectId: objectId,
                        attributes: attributes
                    },
                    webService: {
                        url: WebServicesJson.getDesignPhilosophyItemInfo.url,
                        verb: WebServicesJson.getDesignPhilosophyItemInfo.verb
                    },
                    callback: {
                        onComplete: function (response) {
                            console.log("IDCard response : ", JSON.stringify(response));
                            resolve(response);
                        },
                        onFailure: function (error) {
                            ServiceUtil._displayNotification("error", "Unable to get the Attribute Information ", error);
                            reject(error);
                        }
                    }
                };
                ServiceUtil.SendServerRequest(request);
            });
        },
        getDMCAttributeList: function () {
            return new Promise(function (resolve, reject) {
                var request = {
                    data: AttributesJson,
                    webService: {
                        url: WebServicesJson.getAttributes.url,
                        verb: WebServicesJson.getAttributes.verb
                    },
                    callback: {
                        onComplete: function (response) {
                            console.log("Recevied DMC response : ", JSON.stringify(response));
                            resolve(response);
                        },
                        onFailure: function (error) {
                            ServiceUtil._displayNotification("error", "Unable to get the Attribute Information ", error);
                            reject(error);
                        }
                    }
                };
                ServiceUtil.SendServerRequest(request);
            });
        },
        combineInterfaceAndEngineeringItemInformation: function (InterfaceInformation, EngineeringItemInformation) {
            return new Promise(function (resolve) {
                // Iterate over all interfaces and attributes once
                InterfaceInformation.results.forEach(result => {
                    result.interfaces.forEach(iface => {
                        iface.attributes.forEach(attr => {
                            if (EngineeringItemInformation[attr.path] !== undefined) {
                                // Update default if value exists in EngineeringItemInformation
                                attr.default = EngineeringItemInformation[attr.path];
                            } else {
                                // Set default based on Primitive type if value is missing
                                if (attr.Primitive === "String") {
                                    attr.default = "";
                                } else if (attr.Primitive === "Double") {
                                    attr.default = 0.0;
                                }
                            }
                        });
                    });
                });

                resolve(InterfaceInformation);
            });
        },

        // combineInterfaceAndEngneeringItemInformation: function (InterfaceInformation, EngineeringItemInformation) {
        //     return new Promise(function (resolve) {
        //         InterfaceInformation.results.forEach(result => {
        //             result.interfaces.forEach(iface => {
        //                 iface.attributes.forEach(attr => {
        //                     if (EngineeringItemInformation[attr.path] !== undefined) {
        //                         attr.default = previousOutput[attr.path];
        //                     }
        //                 });
        //             });
        //         });
        //         resolve(InterfaceInformation);
        //     });
        // },

        getEngineeringItemInformation: function (engineeringId) {
            return new Promise(function (resolve, reject) {
                var request = {
                    webService: {
                        url: WebServicesJson.getEngineeringItem.url + "/" + engineeringId + "?$fields=dsmveno:CustomerAttributes",
                        verb: WebServicesJson.getEngineeringItem.verb
                    },
                    callback: {
                        onComplete: function (response) {
                            console.log("API Success: ", response);
                            const result = [];
                            if (response && response.member && response.member.length > 0) {
                                response.member.forEach(member => {
                                    const customerAttrs = member.customerAttributes;
                                    for (const parentKey in customerAttrs) {
                                        const childAttrs = customerAttrs[parentKey];
                                        for (const attrKey in childAttrs) {
                                            const value = childAttrs[attrKey];
                                            result.push(`${parentKey}.${attrKey}="${value}"`);
                                        }
                                    }
                                });
                                resolve(result);
                            }
                            resolve(result);
                        },
                        onFailure: function (error, details) {
                            console.error("API Failed: ", error, details);
                            reject(error);
                        }
                    }
                };
                ServiceUtil.SendServerRequest(request);
            })
        },
        captureTabValues: function (fieldRefs, SaveBtn, CancelBtn, objectId) {
            const result = [];
            fieldRefs.forEach(field => {
                const element = document.getElementById(field.id);
                console.log("field.datatype :: ", field.datatype);
                if (element && !element.disabled) {
                    let value;
                    if (field.hasRange) {
                        value = element.value.trim();
                    } else if (field.unit) {
                        const raw = element.value.trim();
                        const num = raw.replace(/[^\d.-]/g, "") || "0";
                        value = num;
                    } else {
                        value = element.value.trim();
                    }
                    result.push({
                        name: field.id,
                        value: value,
                        datatype: field.datatype,
                        isMandatory: field.isMandatory,
                        unit: field.unit
                    });
                }
            });
            console.log("Captured editable field values by ID:", result);
            var request = {
                data: {
                    objectId: objectId,
                    attributes: result
                },
                webService: {
                    url: WebServicesJson.updateRequestedItem.url,
                    verb: WebServicesJson.updateRequestedItem.verb
                },
                callback: {
                    onComplete: function (response) {
                        console.log("Updated response : ", JSON.stringify(response));
                        if (response.status === "KO") {
                            ServiceUtil._displayNotification("error", "Attribute Update Failed", response.message);
                            return;
                        } else if (response.status === "OK") {
                            ServiceUtil._displayNotification("success", "Update Successfull !!!", response.message);
                            // Update initialValue for each field after successful save
                            fieldRefs.forEach(field => {
                                const input = document.getElementById(field.id);
                                if (input) {
                                    input.dataset.initialValue = input.value;
                                }
                            });
                            SaveBtn.style.display = "none";
                            CancelBtn.style.display = "none";
                        }
                    },
                    onFailure: function (error) {
                        let errorTitle = "Attribute Update Failed";
                        let errorMessage = "Please contact user Administrator";
                        console.error("Error Response : ", error);
                        ServiceUtil._displayNotification("error", errorTitle, errorMessage);
                    }
                }
            };
            ServiceUtil.SendServerRequest(request);
        },
        resetTabValues: function (fieldRefs, tableTemplate, SaveBtn, CancelBtn) {
            fieldRefs.forEach(field => {
                const input = document.getElementById(field.id);
                if (input && input.dataset.initialValue !== undefined) {
                    input.value = input.dataset.initialValue;
                }
            });
            SaveBtn.style.display = "none";
            CancelBtn.style.display = "none";
        },
        createAttributesFromTableTemplate: function (TableTemplate, objectId) {
            const attributes = [];
            const columnLabels = (TableTemplate.Header || [])
                .map(headerObj => headerObj.label)
                .filter(label => label !== "Parameter");
            (TableTemplate.table || []).forEach(row => {
                columnLabels.forEach(col => {
                    if (row[col] && typeof row[col] === 'object') {
                        const cellConfig = row[col];
                        attributes.push({
                            "name": cellConfig.id
                        });
                    }
                });
            });
            console.log("Attributes ", attributes);
            return new Promise(function (resolve, reject) {
                var request = {
                    data: {
                        objectId: objectId,
                        attributes: attributes
                    },
                    webService: {
                        url: WebServicesJson.getDesignPhilosophyItemInfo.url,
                        verb: WebServicesJson.getDesignPhilosophyItemInfo.verb
                    },
                    callback: {
                        onComplete: function (response) {
                            console.log("Recevied response for createAttributesFromTableTemplate : ", JSON.stringify(response));
                            resolve(response);
                        },
                        onFailure: function (error) {
                            ServiceUtil._displayNotification("error", "Unable to get the Attribute Information ", error);
                            reject(error);
                        }
                    }
                };
                ServiceUtil.SendServerRequest(request);
            });
        },
        mergeResponseWithTemplate: function (TableTemplate, response) {
            const mergedTemplate = JSON.parse(JSON.stringify(TableTemplate));
            const responseAttributesMap = new Map();
            response.Attributes.forEach(attr => {
                responseAttributesMap.set(attr.name, attr.value);
            });
            const columnLabels = (mergedTemplate.Header || [])
                .map(headerObj => headerObj.label)
                .filter(label => label !== "Parameter");
            (mergedTemplate.table || []).forEach(row => {
                columnLabels.forEach(col => {
                    if (row[col] && typeof row[col] === 'object') {
                        const cellConfig = row[col];
                        const attrName = cellConfig.id;
                        const valueFromResponse = responseAttributesMap.get(attrName);
                        if (valueFromResponse !== undefined && valueFromResponse !== null && valueFromResponse !== '') {
                            cellConfig.default = valueFromResponse;
                        }
                    }
                });
            });
            return mergedTemplate;
        },

        // added from desing


        getSpaceUrls: function () {
            return YATGUtils.getURLs().then(spaceurl => {
                console.log(spaceurl.url);
                return spaceurl.url;
            });
        },

        dragAndDrop: function () {

            Application.initializePlatformServices().then(function () {
                console.log("Platform services initialized successfully");

            }).catch(function (error) {
                console.log('failed to initialize ------> error', error);
            });

            const maincont = document.createElement("div");

            const parentDiv = document.createElement('div');
            parentDiv.className = 'chg-add-member-assignee-field';

            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('YATG_wux-controls-abstract', 'YATG_wux-controls-autoComplete');

            const selectionChipsDiv = document.createElement('div');
            selectionChipsDiv.classList.add('YATG_wux-controls-abstract', 'YATG_wux-controls-selectionChips', 'with-button', 'YATG_wux-controls-autoComplete-selectionChips');
            selectionChipsDiv.setAttribute('has-menu', 'true');
            const createBtn = document.createElement('button');
            createBtn.textContent = "Create New";
            createBtn.className = "drop-action-button";
            selectionChipsDiv.appendChild(createBtn);

            createBtn.addEventListener('click', Application.createForm);

            function createChipCell(labelText, docId) {
                const chipContainer = document.createElement('div');
                chipContainer.classList.add('YATG_wux-chip-cell-container');
                chipContainer.setAttribute('draggable', 'true');

                const img = document.createElement('img');
                img.id = 'imgid1';
                img.src = imageURL + 'document_888108.png';
                img.alt = '';

                const label = document.createElement('li');
                label.classList.add('YATG_wux-chip-cell-label');
                label.id = docId;
                label.textContent = labelText;

                const closeButton = document.createElement('li');
                closeButton.classList.add('YATG_wux-chip-cell-close', 'YATG_wux-ui-3ds', 'YATG_wux-ui-3ds-1x', 'YATG_wux-ui-3ds-close');

                const closeImg = document.createElement('img');
                closeImg.id = 'imgid';
                closeImg.src = imageURL + 'iconActionDelete.png';
                closeImg.alt = '';

                closeImg.addEventListener('click', function () {
                    chipContainer.remove();
                });
                closeButton.appendChild(closeImg);
                chipContainer.appendChild(img);
                chipContainer.appendChild(label);
                chipContainer.appendChild(closeButton);
                return chipContainer;
            }
            const lastWidgetDiv = document.createElement('div');
            lastWidgetDiv.classList.add('YATG_wux-controls-lastWidget-selectionChips');
            controlsDiv.appendChild(selectionChipsDiv);
            controlsDiv.appendChild(lastWidgetDiv);
            parentDiv.appendChild(controlsDiv);
            const addedObjectIds = new Set();
            maincont.appendChild(parentDiv);

            return maincont;
        },

        createForm: async function () {
            var _baseURL = "";
            var imurl = '';

            await Application.getSpaceUrls().then(url => {
                console.log("Returned URL:", url);
                imurl = url + "/webapps/YATGReportManagement/assets/images/";
            });


            if (document.getElementById('modal-overlay')) return;
            var overlay = document.createElement('div');
            overlay.id = 'modal-overlay';

            const myDiv = document.createElement('div');
            myDiv.id = 'myDiv';
            myDiv.className = "modal";

            const myDivHeader = document.createElement('div');
            myDivHeader.id = 'myDivHeader';

            const titleContainer = document.createElement('h2');
            titleContainer.textContent = 'New TPL Creation';

            const crossContainer = document.createElement('div');
            crossContainer.className = "close-icon";
            const closeImg = document.createElement('img');
            closeImg.id = 'imgid';
            console.log(imurl);
            closeImg.src = imurl + 'closeForm.png';
            closeImg.alt = '';
            console.log(imurl + 'closeForm.png');
            crossContainer.appendChild(closeImg);

            myDivHeader.appendChild(titleContainer);
            myDivHeader.appendChild(crossContainer);
            myDiv.appendChild(myDivHeader);


            const formBOdy = document.createElement('div');
            formBOdy.className = 'formBodyContainer';

            function createOtbForm(labelText, plcHolder, fieldId, isDisable, textAreadiv, isMandatory) {

                const formLine = document.createElement('div');
                formLine.className = 'YATG_formLine s12 m12 l12';

                const flexLine = document.createElement('div');
                flexLine.className = 'YATG_flexLine';
                const formLabel = document.createElement('div');
                formLabel.className = 'YATG_formLabel ENONew_AAe-jzh0g06BLzyy6W02 s12';
                formLabel.style.cssText = '';
                const attrLabel = document.createElement('div');
                attrLabel.className = 'YATG_attrLabel YATG_mandAttr';

                const textContainer = document.createElement('span');
                textContainer.className = 'YATG_textContainer';

                const titleSpan = document.createElement('span');
                titleSpan.innerText = labelText;

                textContainer.appendChild(titleSpan);
                attrLabel.appendChild(textContainer);
				const attrMand = document.createElement('div');
				attrMand.className = 'YATG_attrMand';
				attrMand.innerText = ' *';
				if(isMandatory){
					attrLabel.appendChild(attrMand);
				}
				
                formLabel.appendChild(attrLabel);

                const formValue = document.createElement('div');
                formValue.className = 'YATG_formValue s12';

                const formTweakerContainer = document.createElement('div');
                formTweakerContainer.className = 'YATG_formTweakerContainer';
                formTweakerContainer.id = 'V_Name';

                const twContainer = document.createElement('div');
                twContainer.className = 'YATG_tw_container';

                const twElementsContainer = document.createElement('div');
                twElementsContainer.className = 'YATG_tw_elementsContainer';

                const wuxControl = document.createElement('div');
                wuxControl.className = 'YATG_wux-controls-abstract YATG_wux-controls-lineeditor YATG_wux-controls-lineeditor-width input-text-label';
                wuxControl.style.width = '100%';

                if (!textAreadiv) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = fieldId;
                    input.tabIndex = 0;
                    input.autocomplete = 'off';
                    input.className = 'YATG_wux-ui-state-undefined';
                    input.placeholder = plcHolder;

                    if (isDisable) {
                        input.disabled = true;
                        input.value = plcHolder;
                    }

                    wuxControl.appendChild(input);

                }

                if (textAreadiv) {
                    attrMand.innerText = ' ';
                    const textarea = document.createElement("textarea");
                    textarea.id = 'eng-description';
                    textarea.className = "YATG_wux-ui-state-undefined";
                    textarea.placeholder = plcHolder;
                    textarea.cols = 20;
                    textarea.rows = 3;
                    textarea.style.width = "98%";
                    wuxControl.appendChild(textarea);
                }
                twElementsContainer.appendChild(wuxControl);
                twContainer.appendChild(twElementsContainer);
                formTweakerContainer.appendChild(twContainer);
                formValue.appendChild(formTweakerContainer);

                flexLine.appendChild(formLabel);
                flexLine.appendChild(formValue);
                formLine.appendChild(flexLine);

                return flexLine;
            }

            function createOtbFormDropDownForCreds(labelText, fieldId) {

                const formLine = document.createElement('div');
                formLine.className = 'YATG_formLine s12 m12 l12';
                const flexLine = document.createElement('div');
                flexLine.className = 'YATG_flexLine';
                const formLabel = document.createElement('div');
                formLabel.className = 'YATG_formLabel ENONew_AAe-jzh0g06BLzyy6W02 s12';
                formLabel.style.cssText = '';

                const attrLabel = document.createElement('div');
                attrLabel.className = 'YATG_attrLabel YATG_mandAttr';

                const textContainer = document.createElement('span');
                textContainer.className = 'YATG_textContainer';

                const titleSpan = document.createElement('span');
                titleSpan.innerText = labelText;

                textContainer.appendChild(titleSpan);
                attrLabel.appendChild(textContainer);
                const attrMand = document.createElement('div');
                attrMand.className = 'YATG_attrMand';
                attrMand.innerText = ' *';

                attrLabel.appendChild(attrMand);
                formLabel.appendChild(attrLabel);
                const formValue = document.createElement('div');
                formValue.className = 'YATG_formValue s12';

                const formTweakerContainer = document.createElement('div');
                formTweakerContainer.className = 'YATG_formTweakerContainer';
                formTweakerContainer.id = 'V_Name';

                const twContainer = document.createElement('div');
                twContainer.className = 'YATG_tw_container';

                const twElementsContainer = document.createElement('div');
                twElementsContainer.className = 'YATG_tw_elementsContainer';

                const wuxControl = document.createElement('div');
                wuxControl.className = 'YATG_wux-controls-abstract YATG_wux-controls-lineeditor YATG_wux-controls-lineeditor-width input-text-label';
                wuxControl.style.width = '100%';

                const credentialsSelect = document.createElement('select');
                credentialsSelect.id = fieldId;
                wuxControl.appendChild(credentialsSelect);
                twElementsContainer.appendChild(wuxControl);
                twContainer.appendChild(twElementsContainer);
                formTweakerContainer.appendChild(twContainer);
                formValue.appendChild(formTweakerContainer);

                flexLine.appendChild(formLabel);
                flexLine.appendChild(formValue);
                formLine.appendChild(flexLine);

                return flexLine;
            }
			
			async function getELGILibrary(getURL,csrfToken, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
									'Accept': 'application/json',
									'ENO_CSRF_TOKEN': csrfToken,
									'SecurityContext': context
								  },
						type: "json",
						onComplete: function (data) {
							console.log("response:", data);
							//const result = JSON.parse(data);
							const item = data.member.find(entry => entry.title === "PART LIBRARY");

							if (item) {
								console.log("PART LIBRARY ID:", item.id);
								resolve(item.id);
							} else {
								console.warn("No library found with title 'PART LIBRARY'");
								reject({ message: "Library with title 'PART LIBRARY' not found" });
							}
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			async function getAllAttributeDetails(getURL,csrfToken, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
									'Accept': 'application/json',
									'ENO_CSRF_TOKEN': csrfToken,
									'SecurityContext': context
								  },
						type: "json",
						onComplete: function (data) {
							console.log("response:", data);
							var attrDetailsList	=	data.DictionaryNLS;
							resolve(attrDetailsList);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			function getTPLAndSpecSheetClass(getURL, csrfToken, secContext, classNameArr, nonStdClassNameArr) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						type: "json",
						onComplete: function (data) {
							//const result = JSON.parse(data);
							const topLevel = data.member[0];

							const targets = ["TPL", "BOUGHT-OUT", "NON-STANDARD"];
							const paths = {};

							function findPath(node, currentPath) {
								const newPath = [...currentPath, node.title];

								if (targets.includes(node.title)) {
									paths[node.title] = {
										id: node.id,
										path: newPath.join(" -> ")
									};
								}

								if (node.title === "TPL" && node.ChildClasses && node.ChildClasses.member) {
									for (const child of node.ChildClasses.member) {
										if (classNameArr.includes(child.title)) {
											paths[child.title] = {
												id: child.id,
												path: [...newPath, child.title].join(" -> ")
											};
										}
									}
								}
								
								if (node.title === "NON-STANDARD" && node.ChildClasses && node.ChildClasses.member) {
									for (const child of node.ChildClasses.member) {
										console.log("child.title==>",child.title);
										console.log("nonStdClassNameArr==>",nonStdClassNameArr);
										if (nonStdClassNameArr.includes(child.title)) {
											paths[child.title] = {
												id: child.id,
												path: [...newPath, child.title].join(" -> ")
											};
										}
									}
								}
								
								if (node.ChildClasses && node.ChildClasses.member) {
									for (const child of node.ChildClasses.member) {
										findPath(child, newPath);
									}
								}
							}

							findPath(topLevel, []);

							if (paths["TPL"] ) {
								/* console.log("TPL ID:", paths["TPL"].id);
								console.log("TPL Path:", paths["TPL"].path);
								console.log("SPEC SHEET ID:", paths["SPEC SHEET"].id);
								console.log("SPEC SHEET Path:", paths["SPEC SHEET"].path); */
								console.log("***********************************************************************************************************");
								console.log("Paths===>",paths);
								console.log("***********************************************************************************************************");
								
								resolve(paths);
							} else {
								console.warn("One or more titles not found", paths);
								reject({
									message: "Missing one or more required class titles",
									found: paths
								});
							}
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			function getAttributesForClass(getURL, csrfToken, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						type: "json",
						onComplete: function (data) {
							const classObject = data.member[0];

							if (
								classObject &&
								classObject.ClassAttributes &&
								Array.isArray(classObject.ClassAttributes.member)
							) {
								const attributes = classObject.ClassAttributes.member.map(attr => ({
									name: attr.name,
									type: attr.type,
									defaultValue: attr.default,
									authorizedValues: attr.authorizedValues || []
								}));

								resolve(attributes);
							} else {
								reject({ message: "ClassAttributes not found in response" });
							}
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			function createOtbLabel(labelText) { 
				const formLine = document.createElement('div');
				formLine.className = 'YATG_formLine s12 m12 l12';

				const flexLine = document.createElement('div');
				flexLine.className = 'YATG_flexLine';

				const formLabel = document.createElement('div');
				formLabel.className = 'YATG_formLabel ENONew_AAe-jzh0g06BLzyy6W02 s12';

				const attrLabel = document.createElement('div');
				attrLabel.className = 'YATG_attrLabel YATG_mandAttr';

				const textContainer = document.createElement('span');
				textContainer.className = 'YATG_textContainer';

				const titleSpan = document.createElement('span');
				titleSpan.innerText = labelText;
				titleSpan.style.fontStyle = 'italic'; 

				textContainer.appendChild(titleSpan);
				attrLabel.appendChild(textContainer);

				// Add mandatory div for spacing/alignment
				const attrMand = document.createElement('div');
				attrMand.className = 'YATG_attrMand';
				attrMand.innerText = ' ';
				attrLabel.appendChild(attrMand);

				formLabel.appendChild(attrLabel);
				flexLine.appendChild(formLabel);

				// Add empty formValue div to maintain layout
				const formValue = document.createElement('div');
				formValue.className = 'YATG_formValue s12';
				flexLine.appendChild(formValue);

				formLine.appendChild(flexLine);

				return formLine; // Return the outer container
			}

			function createOtbFormDropDown(attrName, authorizedValues, defaultValue, isMandatory) { 
				const fieldId = `dropdown_${attrName}`;
				var labelText = attrDetails["Attribute."+attrName];
				if(!labelText){
					labelText	=	attrName.replace("ELGI_CA_","");
				}
				// Form Line
				const formLine = document.createElement('div');
				formLine.className = 'YATG_formLine s12 m12 l12';

				// Flex Line
				const flexLine = document.createElement('div');
				flexLine.className = 'YATG_flexLine';

				// Label Section
				const formLabel = document.createElement('div');
				formLabel.className = 'YATG_formLabel ENONew_AAe-jzh0g06BLzyy6W02 s12';

				const attrLabel = document.createElement('div');
				attrLabel.className = 'YATG_attrLabel YATG_mandAttr';

				const textContainer = document.createElement('span');
				textContainer.className = 'YATG_textContainer';

				const titleSpan = document.createElement('span');
				titleSpan.innerText = labelText;

				textContainer.appendChild(titleSpan);
				attrLabel.appendChild(textContainer);

				// Mandatory marker
				if(isMandatory){
					const attrMand = document.createElement('div');
					attrMand.className = 'YATG_attrMand';
					attrMand.innerText = ' *';
					attrLabel.appendChild(attrMand);
				}
				formLabel.appendChild(attrLabel);

				// Value Section
				const formValue = document.createElement('div');
				formValue.className = 'YATG_formValue s12';

				const formTweakerContainer = document.createElement('div');
				formTweakerContainer.className = 'YATG_formTweakerContainer';
				formTweakerContainer.id = `V_${attrName}`;

				const twContainer = document.createElement('div');
				twContainer.className = 'YATG_tw_container';

				const twElementsContainer = document.createElement('div');
				twElementsContainer.className = 'YATG_tw_elementsContainer';

				const wuxControl = document.createElement('div');
				wuxControl.className = 'YATG_wux-controls-abstract YATG_wux-controls-lineeditor YATG_wux-controls-lineeditor-width input-text-label';
				wuxControl.style.width = '100%';

				// Dropdown (Select)
				const credentialsSelect = document.createElement('select');
				credentialsSelect.id = fieldId;
				credentialsSelect.className = "YATG_wux-ui-state-undefined";
				credentialsSelect.style.width = "100%";
				credentialsSelect.style.backgroundColor = "white";
				credentialsSelect.style.border = "1px solid #b4b6ba";
				credentialsSelect.style.borderRadius  = "4px";
				credentialsSelect.style.fontSize  = "12px";
				credentialsSelect.style.fontFamily  = "Arial";

				credentialsSelect.addEventListener("mouseover", () => {
				  credentialsSelect.style.border = "1px solid black";
				});
				credentialsSelect.addEventListener("mouseout", () => {
				  credentialsSelect.style.border = "1px solid #b4b6ba";
				});

				// Populate dropdown options
				authorizedValues.forEach(value => {
					const option = document.createElement('option');
					option.value = value;
					if(attrDetails["Range."+attrName+"."+value]){
						option.text = attrDetails["Range."+attrName+"."+value];
					}else{
						option.text = value;
					}
					

					if (value === defaultValue) {
						option.selected = true;
					}
					credentialsSelect.appendChild(option);
				});
				
				if (attrName === "ELGI_CA_PartCategory") {
				  credentialsSelect.addEventListener("change", async (event) => {
					try {
					  const selectElement = event.target;
					  const selectedValue = selectElement.options[selectElement.selectedIndex].text;
					  console.log("SelectedValue ===>", selectedValue);

					  const formBOdy = document.querySelector(".formBodyContainer");
					  console.log("formBOdy ===>", formBOdy);

					  if (formBOdy) {
						const attrFieldsArr = formBOdy.querySelectorAll(".YATG_formLine,.YATG_flexLine");
						console.log("attrFieldsArr ===>", attrFieldsArr);

						[...attrFieldsArr].forEach((fieldNode) => {
						  const fieldText = fieldNode.innerHTML.trim();
						  if (!(
							fieldText.includes("Title") ||
							fieldText.includes("Description") ||
							fieldText.includes("Credentials") ||
							fieldText.includes("BookMark") ||
							fieldText.includes("ELGI_CA_PartType") ||
							fieldText.includes("ELGI_CA_PartCategory")
						  )) {
							  
							fieldNode.remove();
							console.log("Removed field ===>", fieldText);
						  }else if(fieldText.includes("Fab Model Description") || fieldText.includes("Part Item Category")){
							  fieldNode.remove();
							  console.log("else if Removed field ===>", fieldText);
						  }
						});
					  }

					  let baseURL = null, classTPLPath = null;
			
					  const csrfTok = await YATGUtils.getCSRFToken();
					  csrfToken = csrfTok;
					  console.log("csrfTok====>", csrfTok);
					  console.log("strLibOID====>", strLibOID);

					  try {
						  const spaceurl = await YATGUtils.getURLs();
						  baseURL = spaceurl.url;
						  console.log("this is base url", baseURL);
						if (strLibOID) {
						  const getClassURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Library/${strLibOID}?$mask=dslib:ExpandClassesMask`;
						  const resultMap = await getTPLAndSpecSheetClass(getClassURL, csrfToken, null, [],[]);

						  switch (selectedValue) {
							case "Non-Standard Part": {
							  classTPLOID = resultMap["TPL"].id;
							  classNonStdOID = resultMap["NON-STANDARD"].id;
							  classTPLPath = resultMap["TPL"].path;
							  console.log("classTPLOID ===>", classTPLOID);
							  console.log("classTPLPath ===>", classTPLPath);

							  if (classTPLPath && classNonStdOID) {
								let getClassAttributesURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Class/${classTPLOID}?$mask=dslib:ClassAttributesMask`;
								let classAttrMap = await getAttributesForClass(getClassAttributesURL, csrfToken, null);
								console.log("classAttrMap ===>", classAttrMap);
								formBOdy.appendChild(createOtbLabel("TPL"));
								classAttrMap.forEach(attr => {
								   if(attr.authorizedValues?.length === 0){
										var labelText = attrDetails["Attribute."+attr.name];
										if(!labelText){
											labelText	=	attr.name.replace("ELGI_CA_","");
										}
										formBOdy.appendChild(createOtbForm(labelText, '', attr.name, false, false, false));
									}else{
									  formBOdy.appendChild(createOtbFormDropDown(
										attr.name,
										attr.authorizedValues,
										attr.defaultValue,
										false
									  ));
									}
								});
								
								formBOdy.appendChild(createOtbFormDropDown(
								  "ELGI_CA_ProductGroupType",
								  defaultAttrJSON["ELGI_CA_ProductGroupType"].values,
								  defaultAttrJSON["ELGI_CA_ProductGroupType"].defaultValue,
								  true
								));

							  }
							  break;
							}

							case "Bought-out Part": {
							  console.log("Inside BOUGHT-OUT onchange!!!!");
							  console.log("resultMap==>",resultMap);
							  const boughtOutOID = resultMap["BOUGHT-OUT"].id;
							  classToClassifyOID = boughtOutOID;
							  console.log("classToClassifyOID===>",classToClassifyOID);
							  let getClassAttributesURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Class/${boughtOutOID}?$mask=dslib:ClassAttributesMask`;
							  let classAttrMap = await getAttributesForClass(getClassAttributesURL, csrfToken, null);
								console.log("classAttrMap ===>", classAttrMap);
								const filteredAttrNames = classAttrMap
								.map(attr => attr.name);
							   classAttributesName	=	filteredAttrNames;
								formBOdy.appendChild(createOtbLabel("BOUGHT-OUT"));
								classAttrMap.forEach(attr => {
									 if(attr.authorizedValues?.length === 0){
										var labelText = attrDetails["Attribute."+attr.name];
										if(!labelText){
											labelText	=	attr.name.replace("ELGI_CA_","");
										}
										formBOdy.appendChild(createOtbForm(labelText, '', attr.name, false, false, false));
									}else{
									  formBOdy.appendChild(createOtbFormDropDown(
										attr.name,
										attr.authorizedValues,
										attr.defaultValue,
										false
									  ));
									}
								});
							  break;
							}
						  }
						}
					  } catch (err) {
						console.error("Error :", err);
					  }

					} catch (error) {
					  console.error("Error in change handler:", error);
					}
				  });
				}

				
				if (attrName === "ELGI_CA_ProductGroupType") {
					credentialsSelect.addEventListener("change", async (event) => {
						try {
							classToClassifyOID				=	null;
							classAttributesName				=	null;
							classNonStdOID					=	null;
							classNonStdAttributesName		=	null;
							// Get selected value from dropdown
							const selectElement = event.target;
							const selectElementBackendVal	=	selectElement.value.split("-")[0];
							const selectedValue = selectElement.options[selectElement.selectedIndex].text;
							console.log("SelectedValue ===>", selectedValue);

							// Get form body container
							const formLineTags = document.querySelector(".formBodyContainer");
							console.log("formLineTags ===>", formLineTags);

							if (formLineTags) {
								// Get all formLine rows
								const attrFieldsArr = formLineTags.querySelectorAll(".YATG_formLine,.YATG_flexLine");
								console.log("attrFieldsArr ===>", attrFieldsArr);

								// Remove fields except specific ones
								[...attrFieldsArr].forEach((fieldNode) => {
									const fieldText = fieldNode.innerHTML.trim();
									if (!(
										fieldText.includes("Title") ||
										fieldText.includes("Description") ||
										fieldText.includes("Credentials") ||
										fieldText.includes("BookMark") ||
										fieldText.includes("ELGI_CA_PartItemCategory") ||
										fieldText.includes("ELGI_CA_ProductGroupType") ||
										fieldText.includes("ELGI_CA_TPLProductLine") ||
										fieldText.includes("ELGI_CA_PartType") ||
										fieldText.includes("ELGI_CA_PartCategory")||
										fieldText.includes("TPL")
									)) {
										fieldNode.remove();
										console.log("Removed field ===>", fieldText);
									}else if(fieldText.includes("Fab Model Description") || fieldText.includes("Part Item Category")){
										  fieldNode.remove();
										  console.log("else if Removed field ===>", fieldText);
									  }
								});
							}

							// Parse class JSON
							var classJSON;
							switch(selectElementBackendVal){
								case "99":{
									classJSON = JSON.parse(AirEndClassJSON);
									break;
								}
								case "02":{
									classJSON = JSON.parse(RACClassJSON);
									break;
								}
								case "03":{
									classJSON = JSON.parse(DPSACClassJSON);
									break;
								}
								case "41":{
									classJSON = JSON.parse(OFSACClassJSON);
									break;
								}
								case "01":{
									classJSON = JSON.parse(EPSACClassJSON);
									break;
								}
								case "07":{
									classJSON = JSON.parse(RLYClassJSON);
									break;
								}
								case "60":{
									classJSON = JSON.parse(DryerClassJSON);
									break;
								}
								case "88":{
									classJSON = JSON.parse(JORCClassJSON);
									break;
								}
								case "05":{
									classJSON = JSON.parse(VaccumPumpsClassJSON);
									break;
								}
							}
							console.log("classJSON===>",classJSON);
							var nonStdClassName;
							switch(selectElementBackendVal){
								case "50" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "78" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "79" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "80" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "81" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "83" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "96" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "99" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								case "51" :{
									nonStdClassName	=	classMapJSON.ClassNameMap[selectElementBackendVal];
									break;
								}
								default : {
									nonStdClassName	=	"Other Product Groups";
								}
							}
							console.log("nonStdClassName===>",nonStdClassName);
							// Fetch subclass info
							const subClassURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Library/${strLibOID}?$mask=dslib:ExpandClassesMask`;
							const tplSubClass = await getTPLAndSpecSheetClass(subClassURL, csrfToken, null, [selectedValue], [nonStdClassName]);
							let classObj;
							if(tplSubClass[selectedValue]){
								const subClassID = tplSubClass[selectedValue].id;
								const subClassPath = tplSubClass[selectedValue].path;
								console.log("subClassID ===>", subClassID);
								console.log("subClassPath ===>", subClassPath);
								classToClassifyOID	=	subClassID;
								// Fetch class attribute map
								const classAttributesURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Class/${subClassID}?$mask=dslib:ClassAttributesMask`;
								const ClassAttrMap = await getAttributesForClass(classAttributesURL, csrfToken, null);
								// Find the class object from JSON
								var onChangeMap	=	{};
								if(classJSON){
									classObj = classJSON.Classes.find(obj => Object.keys(obj)[0] === selectedValue);
									if (!classObj) {
										alert("Class " + selectedValue +" not found in JSON");
										return;
									}

									const attributes = classObj[selectedValue].Attributes;
									//console.log("ClassAttrMap ===>", ClassAttrMap);
									//createOtbLabel("TPL");
									// Filter attribute names
									const filteredAttrNames = ClassAttrMap
										.filter(attr => attr.name !== "ELGI_CA_TPLProductLine" &&
														attr.name !== "ELGI_CA_ProductGroupType" &&
														attr.name !== "ELGI_CA_PartItemCategory")
										.map(attr => attr.name);
									classAttributesName	=	filteredAttrNames;
									
									// Process attributes from JSON
									filteredAttrNames.forEach(attrName => {
										attributes.forEach(attrObj => {
											if (attrObj[attrName]) {
												const attrDetails = attrObj[attrName];
												/* console.log("Attribute Name:", attrName);
												console.log("Attribute Details:", attrDetails);
												console.log("Attribute Onchange:", attrDetails.onChange); */
												if(attrDetails.IsRange === "True"){
													formBOdy.appendChild(
													  createOtbFormDropDown(
														attrName,
														attrDetails.Range,
														attrDetails.Default,
														false
													  )
													);
												}
												if(attrDetails.onChange){
													onChangeMap[attrName] = attrDetails.onChange;
												}
											}
										});
									});
								}else if(ClassAttrMap && subClassID && subClassPath.includes("TPL")){
									const filteredAttrNames = ClassAttrMap
									.map(attr => attr.name);
									classAttributesName		=	filteredAttrNames;
									ClassAttrMap.forEach(attr => {
									  if(attr.authorizedValues?.length === 0){
											var labelText = attrDetails["Attribute."+attr.name];
											if(!labelText){
												labelText	=	attr.name.replace("ELGI_CA_","");
											}
											formBOdy.appendChild(createOtbForm(labelText, '', attr.name, false, false, false));
										}else{
										  formBOdy.appendChild(createOtbFormDropDown(
											attr.name,
											attr.authorizedValues,
											attr.defaultValue,
											false
										  ));
										}
									});
								}
							}
							formBOdy.appendChild(createOtbLabel("NON-STANDARD"));
							classNonStdOID		=	tplSubClass[nonStdClassName].id;
							// Fetch class attribute map
							const classNonStdAttributesURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Class/${classNonStdOID}?$mask=dslib:ClassAttributesMask`;
							const classNonStdAttrMap = await getAttributesForClass(classNonStdAttributesURL, csrfToken, null);
							//console.log("ClassAttrMap ===>", ClassAttrMap);

							// Filter attribute names
							const filteredNonStdAttrNames = classNonStdAttrMap
								.map(attr => attr.name);
							classNonStdAttributesName	=	filteredNonStdAttrNames;
							classNonStdAttrMap.forEach(attr => {
								  if(attr.authorizedValues?.length === 0){
										var labelText = attrDetails["Attribute."+attr.name];
										if(!labelText){
											labelText	=	attr.name.replace("ELGI_CA_","");
										}
										formBOdy.appendChild(createOtbForm(labelText, '', attr.name, false, false, false));
									}else{
									  formBOdy.appendChild(createOtbFormDropDown(
										attr.name,
										attr.authorizedValues,
										attr.defaultValue,
										false
									  ));
									}
								});
							
							console.log("onChangeMap==>",onChangeMap);
							if(onChangeMap && classJSON){
								 Object.entries(onChangeMap).forEach(([key, value]) => {
									/* console.log("Key ===> " + key);
									console.log("Value ===> " + value); */
									var onChangeObj = 	classObj[selectedValue].onChange[value];
									//console.log("onChangeObj==>",onChangeObj);
									
									var attrField	=	document.getElementById("dropdown_"+key);
									if(attrField){
										attrField.addEventListener("change", (event) => {
											var SelectedValue	=	event.target.value;
											var attrValToChangeObj;
											
											if(onChangeObj[SelectedValue]){
												//console.log("onChangeObj[SelectedValue]===>",onChangeObj[SelectedValue]);
												attrValToChangeObj	=	onChangeObj[SelectedValue];
											}else{
												if(onChangeObj.Other){
													attrValToChangeObj		=	onChangeObj.Other;
												}
											}
											//console.log("attrValToChangeObj===>",attrValToChangeObj);
											Object.entries(attrValToChangeObj).forEach(([attrToChgkey, attrToChgvalue]) => {
												/* console.log("attrToChgkey==>",attrToChgkey);
												console.log("attrToChgvalue==>",attrToChgvalue); */
												if(attrToChgkey === "Dependent_Attributes"){
													console.log("Inside Dependent_Attributes If");
													var dependentAttributesArr	=	attrToChgvalue;
													//console.log("dependentAttributesArr===>", dependentAttributesArr);
													for (let condArr of dependentAttributesArr) {
														//console.log("condArr===>",condArr);
														for(let condObj of condArr){
															console.log("condObj==>",condObj);
															var checkKeys = Object.keys(condObj).filter(key => key.startsWith("AttributesToCheck."));
															console.log("checkKeys===>",checkKeys);
															var isConditionPassed	=	false;
															for(let cond of checkKeys){
																var attrToCheckName			=	cond.split(".")[1];
																var attrToCheckField		=	document.getElementById("dropdown_"+attrToCheckName);
																//console.log("attrToCheckName==>",attrToCheckName);
																//console.log("attrToCheckField==>",attrToCheckField);
																var attrToCheckActualVal	=	attrToCheckField.value;
																//console.log("attrToCheckActualVal==>",attrToCheckActualVal);
																if(condObj[cond].includes(attrToCheckActualVal) || condObj[cond].includes("OTHER_VALUES")){
																	isConditionPassed		=	true;
																}else{
																	isConditionPassed		=	false;
																	break;
																}
															}
															
															if(isConditionPassed){
																var changeKeys = Object.keys(condObj).filter(key => key.startsWith("AttributesToChange."));
																for(let changeAttr of changeKeys){
																	var attrToChangeName		=	changeAttr.split(".")[1];
																	var attrToChgField			=	document.getElementById("dropdown_"+attrToChangeName);
																	if(attrToChgField){
																		let attrToChgValue		= attrToChgField.value;
																		let attrToChgRanges 	= condObj[changeAttr];
																		attrToChgField.innerHTML 	= 	"";
																		let foundMatch = false;
																		attrToChgRanges.forEach(range => {
																			const option = document.createElement("option");
																			option.value = range;
																			option.text = range;
																			//console.log("Range ==>",range);
																			if(range === attrToChgValue){
																				option.selected = true; 
																				foundMatch		= true;
																			}
																			
																			attrToChgField.appendChild(option);
																			//console.log("productSeriesSelect==>",productSeriesSelect);
																		});
																		if (!foundMatch) {
																			const unassignedOption = [...attrToChgField.options].find(opt => opt.value === "Unassigned");
																			if (unassignedOption) unassignedOption.selected = true;
																		}
																	}
																}
																break;
															}
														}
														
													}
													
												}else{
													var attrToChgField	=	document.getElementById("dropdown_"+attrToChgkey);
													if(attrToChgField){
														let attrToChgValue		= attrToChgField.value;
														let attrToChgRanges 	= attrToChgvalue;
														attrToChgField.innerHTML 	= 	"";
														let foundMatch = false;
														attrToChgRanges.forEach(range => {
															const option = document.createElement("option");
															option.value = range;
															option.text = range;
															//console.log("Range ==>",range);
															if(range === attrToChgValue){
																option.selected = true; 
																foundMatch		= true;
															}
															attrToChgField.appendChild(option);
															//console.log("productSeriesSelect==>",productSeriesSelect);
														});
														if (!foundMatch) {
															const unassignedOption = [...attrToChgField.options].find(opt => opt.value === "Unassigned");
															if (unassignedOption) unassignedOption.selected = true;
														}
													}
												}
											});
										});
									}
								});
							}
						} catch (error) {
							console.error("Error in credentialsSelect change handler:", error);
						}
					});
				}
				



				wuxControl.appendChild(credentialsSelect);
				twElementsContainer.appendChild(wuxControl);
				twContainer.appendChild(twElementsContainer);
				formTweakerContainer.appendChild(twContainer);
				formValue.appendChild(formTweakerContainer);

				// Append label and value
				flexLine.appendChild(formLabel);
				flexLine.appendChild(formValue);
				formLine.appendChild(flexLine);

				return formLine; // return the full row
			}
			
			function createOtbFormSearch(labelText, plcHolder, fieldId, isDisable, textAreadiv, isMandatory) {
				var current = this;
                const formLine = document.createElement('div');
                formLine.className = 'YATG_formLine s12 m12 l12';

                const flexLine = document.createElement('div');
                flexLine.className = 'YATG_flexLine';
                const formLabel = document.createElement('div');
                formLabel.className = 'YATG_formLabel ENONew_AAe-jzh0g06BLzyy6W02 s12';
                formLabel.style.cssText = '';
                const attrLabel = document.createElement('div');
                attrLabel.className = 'YATG_attrLabel YATG_mandAttr';

                const textContainer = document.createElement('span');
                textContainer.className = 'YATG_textContainer';

                const titleSpan = document.createElement('span');
                titleSpan.innerText = labelText;

                textContainer.appendChild(titleSpan);
                attrLabel.appendChild(textContainer);
				if(isMandatory){
					const attrMand = document.createElement('div');
					attrMand.className = 'YATG_attrMand';
					attrMand.innerText = ' *';

					attrLabel.appendChild(attrMand);
				}
                formLabel.appendChild(attrLabel);

                const formValue = document.createElement('div');
                formValue.className = 'YATG_formValue s12';

                const formTweakerContainer = document.createElement('div');
                formTweakerContainer.className = 'YATG_formTweakerContainer';
                formTweakerContainer.id = 'V_Name';

                const twContainer = document.createElement('div');
                twContainer.className = 'YATG_tw_container';

                const twElementsContainer = document.createElement('div');
                twElementsContainer.className = 'YATG_tw_elementsContainer';

                const wuxControl = document.createElement('div');
                wuxControl.className = 'YATG_wux-controls-abstract YATG_wux-controls-lineeditor YATG_wux-controls-lineeditor-width input-text-label';
                wuxControl.style.width = '100%';

                if (!textAreadiv) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = fieldId;
                    input.tabIndex = 0;
                    input.autocomplete = 'off';
                    input.className = 'YATG_wux-ui-state-undefined';
                    input.placeholder = plcHolder;

                    if (isDisable) {
                        input.disabled = true;
                        input.value = plcHolder;
                    }
					
					const button = document.createElement('button');
					button.type = 'button';
					button.innerText = 'search';
					button.style.marginLeft = "5px";
					button.style.padding = "4px 8px";
					button.style.border = "1px solid #b4b6ba";
					button.style.borderColor = "#368ec4";
					button.style.borderRadius = "4px";
					button.style.backgroundColor = "#42a2da";
					button.style.color = "white";
					button.style.cursor = "pointer";
					button.addEventListener("click", () => {
						//alert("Button clicked for " + fieldId);
						NewChooser.launchContextSearch(current);
						
					});

					// Wrap input and button together in a container
					const inputWrapper = document.createElement('div');
					inputWrapper.style.display = "flex";
					inputWrapper.style.alignItems = "center";
					inputWrapper.style.gap = "5px";
					
					input.style.flex = "1";             
					input.style.minWidth = "0";         
					input.style.width = "auto";          

					// Button (fixed size)
					button.style.flex = "0 0 auto";
					button.style.whiteSpace = "nowrap";  

					inputWrapper.appendChild(input);
					inputWrapper.appendChild(button);
                    wuxControl.appendChild(inputWrapper);

                }
				

                if (textAreadiv) {
                    attrMand.innerText = ' ';
                    const textarea = document.createElement("textarea");
                    textarea.id = 'eng-description';
                    textarea.className = "YATG_wux-ui-state-undefined";
                    textarea.placeholder = plcHolder;
                    textarea.cols = 20;
                    textarea.rows = 3;
                    textarea.style.width = "98%";
                    wuxControl.appendChild(textarea);
                }
                twElementsContainer.appendChild(wuxControl);
                twContainer.appendChild(twElementsContainer);
                formTweakerContainer.appendChild(twContainer);
                formValue.appendChild(formTweakerContainer);

                flexLine.appendChild(formLabel);
                flexLine.appendChild(formValue);
                formLine.appendChild(flexLine);

                return flexLine;
            }
			
			const spaceurl = await YATGUtils.getURLs();
			baseURL = spaceurl.url;
			console.log("Base URL ===>", baseURL);

			const getAttrLabUrl = `${baseURL}/resources/dictionary/DictionaryCUSTO?&package=ClassificationDefaultPack&lang=en`;
			attrDetails = await getAllAttributeDetails(getAttrLabUrl, csrfToken, null);
			console.log("Full Attributes Details=====>", attrDetails);

			const getLibURL = `${baseURL}/resources/v1/modeler/dslib/dslib:Library/search?$searchStr=PART LIBRARY`;
			strLibOID = await getELGILibrary(getLibURL, csrfToken, null);
			console.log("strLibOID ===>", strLibOID);

            formBOdy.appendChild(createOtbForm('Title', 'Enter a value', 'eng-title', false, false, false));

            formBOdy.appendChild(createOtbForm('Description', 'Enter description', 'eng-description', false, true, false));
			
			formBOdy.appendChild(createOtbFormDropDownForCreds('Credentials', 'eng-cred'));
			
			formBOdy.appendChild(createOtbFormSearch('BookMark', 'Search BookMark', 'bookmark', false, false, false));
			
			formBOdy.appendChild(createOtbFormDropDown(
								"ELGI_CA_PartCategory",               // attrName
								defaultAttrJSON["ELGI_CA_PartCategory"].values,   				// authorizedValues
								defaultAttrJSON["ELGI_CA_PartCategory"].defaultValue,        // defaultValue
								true
							));
			
			//formBOdy.appendChild(createOtbForm('Library', 'TPL', 'ip-Class', true, false));
			formBOdy.appendChild(createOtbFormDropDown(
								"ELGI_CA_PartType",               // attrName
								defaultAttrJSON["ELGI_CA_PartType"].values,   				// authorizedValues
								defaultAttrJSON["ELGI_CA_PartType"].defaultValue,        // defaultValue
								true
							));
			
            myDiv.appendChild(formBOdy);

            const footer = document.createElement('div');
            footer.className = 'YATG_wux-windows-dialog-footer resize-padding';

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'YATG_wux-windows-dialog-buttons';
            buttonsContainer.style.maxWidth = '570px';

            const createButton = document.createElement('div');
            createButton.className = 'YATG_wux-controls-abstract YATG_wux-controls-button YATG_wux-ui-style-normal YATG_wux-ui-state-primary';
            createButton.tabIndex = 0;
            createButton.dataset.recId = 'null_Ok';
            const createLabel = document.createElement('span');
            createLabel.className = 'wux-button-label';
            createLabel.textContent = 'Create';
            createButton.appendChild(createLabel);

            const cancelButton = document.createElement('div');
            cancelButton.className = 'YATG_wux-controls-abstract YATG_wux-controls-button YATG_wux-ui-state-secondary YATG_wux-ui-style-normal';
            cancelButton.tabIndex = 0;
            cancelButton.dataset.recId = 'null_Discard';
            const cancelLabel = document.createElement('span');
            cancelLabel.className = 'YATG_wux-button-label';
            cancelLabel.textContent = 'Cancel';
            cancelButton.appendChild(cancelLabel);

            buttonsContainer.appendChild(createButton);
            buttonsContainer.appendChild(cancelButton);
            footer.appendChild(buttonsContainer);
            myDiv.appendChild(footer);

            overlay.appendChild(myDiv);
            document.body.appendChild(overlay);

            cancelButton.addEventListener('click', function () {
                document.body.removeChild(overlay);
            });

            crossContainer.addEventListener('click', function () {
                document.body.removeChild(overlay);
            });
			
			function getRandomNumber(){
				return Math.floor(1000 + Math.random() * 9000);
			}
			
			async function createEngineeringItem(engURL, title, description, csrfToken, secContext) {
				const payload = {
									items: [{
										type: "VPMReference",
										attributes: {
											title: title,
											description: description
										}
									}]
								};
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(engURL, {
						method: "POST",
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': secContext
						},
						data: JSON.stringify(payload),
						type: "json",
						onComplete: function (response) {
							console.log("response:" , response);
							const createdItem = response.member[0];
							resolve(createdItem);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function fetchEngineeringItemInfo(engURL,physicalProdID,csrfToken, secContext) {
				engURL	=	engURL + '/'+physicalProdID;
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(engURL, {
						method: "GET",
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': secContext
						},
						type: "json",
						onComplete: function (response) {
							console.log("response:" , response);
							const ItemInfo = response.member[0];
							resolve(ItemInfo);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function classifyItem(classifyURL, csrfToken, payload, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(classifyURL, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						data: JSON.stringify(payload),
						type: 'json',
						onComplete: function (response) {
							console.log("Classification result:", response);
							resolve(response)
						},
						onFailure: function (error) {
							console.error("Classification failed:", error);
							reject(error);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			function getClassifiedItemCEStamp(getURL, csrfToken, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						type: "json",
						onComplete: function (data) {
							var ceStamp = data.member[0].cestamp;
							resolve(ceStamp);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function updateClassifiedItemAttribute(updateURL, csrfToken, updatePayload, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				
				return new Promise(function (resolve, reject) {
					
					WAFData.authenticatedRequest(updateURL, {
						  method: 'POST',
						  headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						  },
						  data: JSON.stringify(updatePayload),
						onComplete: function (response) {
							console.log("Update Classified Attribute Response==>",response);
							resolve(response);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function createDocument(createDocURL, csrfToken,createDocPayload, secContext) {
				
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(createDocURL, {
						method: 'POST',
						type: 'json',
						data: JSON.stringify(createDocPayload),
						headers: {
							'Content-Type': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': secContext
						},
						onComplete: function (response) {
							const createdDoc = response.data[0];
							console.log("Created Doc resp==>",createdDoc);
							/* const createdDocId = createdDoc.id;
							console.log("Document created:", createdDocId); */
							resolve(createdDoc);
						},
						onFailure: function (e, t) {
							console.error("error in creating document===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function updateDocument(createDocURL, csrfToken, updatePayload, secContext) {

				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(createDocURL, {
						method: 'PUT',
						type: 'json',
						data: JSON.stringify(updatePayload),
						headers: {
							'Content-Type': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': secContext
						},
						onComplete: function (response) {
							resolve(response);
						},
						onFailure: function (e, t) {
							console.error("error in updating document ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function connectDocument(addSpecDocURL, csrfToken, payload) {
				
				return new Promise(function (resolve, reject) {
					
					WAFData.authenticatedRequest(addSpecDocURL, {
						method: 'POST',
						type: 'json',
						headers: {
							'Content-Type': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'Accept': 'application/json'
						},
						data: JSON.stringify(payload),
						onComplete: function (response) {
							console.log("Spec Doc response==>",response);
							resolve(response);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function getFolder(getFolderURL, csrfToken, secContext) {
			  return new Promise(function (resolve, reject) {
				WAFData.authenticatedRequest(getFolderURL, {
				  method: "GET",
				  headers: {
					'Accept': 'application/json',
					'ENO_CSRF_TOKEN': csrfToken,
					'SecurityContext': secContext
				  },
				  type: "json",
				  onComplete: function (response) {
					console.log("response:", response);
					let json;

					if (response && response.success && Array.isArray(response.data)) {
					  json = response;
					}
					else if (response && response.responseText) {
					  json = JSON.parse(response.responseText);
					} else if (typeof response === "string") {
					  json = JSON.parse(response);
					} else {
					  throw new Error("Unknown response format");
					}

					const dataIds = Array.isArray(json.data) ? json.data.map(item => item.id) : [];

					console.log("Data IDs:", dataIds);
					resolve(dataIds);   // return IDs directly
				  },
				  onFailure: function (e, t) {
					console.error("error ===>", e.message);
					console.error("details ===>", t);
					reject(e);
				  },
				  onTimeout: function () {
					const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
					console.error("Timeout error:", timeoutError);
					reject(timeoutError);
				  }
				});
			  });
			}
			
			async function addDocToBookMark(bookMarkURL, csrfToken, createdCRDDocId, payload,secContext) {
				
				return new Promise(function (resolve, reject) {
					
					WAFData.authenticatedRequest(bookMarkURL, {
						method: 'POST',
						type: 'json',
						headers: {
							'Content-Type': 'application/json',
							'SecurityContext': secContext,
							'ENO_CSRF_TOKEN': csrfToken
						},
						data: payload,
						onComplete: function (response) {
							console.log("Doc added to bookmark response==>",response);
							resolve(response);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			function getFolderName(getURL, csrfToken, secContext) {
				var context	=	null;
				if(secContext){
					context	=	secContext;
				}else{
					context	=	'VPLMProjectLeader.Company Name.Common Space';
				}
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						type: "json",
						onComplete: function (data) {
							console.log("getFolderName response===>"+data);
							let title = data.member[0].title; // return only first title
							console.log("Title:", title);
							resolve(title);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			async function updatePhysicalProduct(url, csrfToken, payload, secContext) {
				
				return new Promise(function (resolve, reject) {
					
					WAFData.authenticatedRequest(url, {
						method: 'PATCH',
						type: 'json',
						headers: {
							'Content-Type': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': secContext,
							'Accept': 'application/json'
						},
						data: JSON.stringify(payload),
						onComplete: function (response) {
							console.log("Physical Product Update response==>",response);
							resolve(response);
						},
						onFailure: function (e, t) {
							console.error("error in updating Physical Product ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			function getRunningNumber(getURL, csrfToken, secContext) {
				var context	=	secContext;
				return new Promise(function (resolve, reject) {
					WAFData.authenticatedRequest(getURL, {
						method: "GET",
						headers: {
							'Accept': 'application/json',
							'ENO_CSRF_TOKEN': csrfToken,
							'SecurityContext': context
						},
						type: "json",
						onComplete: function (data) {
							console.log("data response===>"+data);
							var strNextNum	=	data[0].NextSequenceNumber;
							console.log("Next seq Number==>", strNextNum);
							resolve(strNextNum);
						},
						onFailure: function (e, t) {
							console.error("error ===>", e.message);
							console.error("details ===>", t);
							reject(e);
						},
						onTimeout: function () {
							const timeoutError = { errorCode: "NetworkError", message: "Request timed out" };
							console.error("Timeout error:", timeoutError);
							reject(timeoutError);
						}
					});
				});
			}
			
			function callEINWebServiceAsync(id, newEIN) {
			  return new Promise((resolve, reject) => {
				i3DXCompassServices.getServiceUrl({
				  platformId: widget.getValue("x3dPlatformId"),
				  serviceName: "3DSpace",
				  onComplete: function (URL3DSpace) {
					let baseUrl = typeof URL3DSpace === "string" ? URL3DSpace : URL3DSpace[0].url;

					const csrfURL = baseUrl + "/resources/v1/application/CSRF";
					console.log("Inside method callEINWebServiceAsync");

					WAFData.authenticatedRequest(csrfURL, {
					  method: "GET",
					  type: "json",
					  onComplete: function (csrfData) {
						const csrfToken = csrfData.csrf.value;
						const csrfHeader = csrfData.csrf.name;
						const engUrl = baseUrl + "/resources/v1/modeler/dseng/dseng:EngItem/" + id + "/dseng:EnterpriseReference";

						const payload = { partNumber: newEIN };
						console.log("Before calling ", engUrl);

						WAFData.authenticatedRequest(engUrl, {
						  method: "POST",
						  type: "json",
						  headers: {
							"Content-Type": "application/json",
							"SecurityContext": "VPLMProjectLeader.Company Name.Common Space",
							[csrfHeader]: csrfToken,
						  },
						  data: JSON.stringify(payload),
						  onComplete: function (response) {
							console.log("EIN Web Service Success:", response);
							resolve(response);
						  },
						  onFailure: function (error) {
							console.error("EIN Web Service Error:", error);
							reject(error);
						  },
						});
					  },
					  onFailure: function (err) {
						console.error("Failed to fetch CSRF token:", err);
						reject(err);
					  },
					});
				  },
				  onFailure: function (err) {
					console.error("Failed to get 3DSpace URL:", err);
					reject(err);
				  },
				});
			  });
			}
			
            createButton.addEventListener('click',async function (e) {
                e.preventDefault();
				  // Overlay
				const spinnerOverlay = UWA.createElement('div', {
				  styles: {
					position: 'fixed',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					backgroundColor: 'rgba(0,0,0,0.3)',
					zIndex: 9999,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				  }
				}).inject(document.body);

				// Spinner container
				const spinnerBox = UWA.createElement('div', {
				  styles: {
					padding: '20px',
					background: '#fff',
					borderRadius: '8px',
					boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: '10px' 
				  }
				}).inject(spinnerOverlay);

				// Spinner icon
				const spinnerIcon = UWA.createElement('div', {
				  styles: {
					border: '6px solid #f3f3f3',       // Light grey
					borderTop: '6px solid #3498db',    // Blue
					borderRadius: '50%',
					width: '40px',
					height: '40px',
					animation: 'spin 1s linear infinite'
				  }
				}).inject(spinnerBox);

				// Loading text
				UWA.createElement('div', {
				  text: 'Loading...',
				  styles: {
					marginTop: '10px',
					fontSize: '16px',
					fontWeight: 'bold'
				  }
				}).inject(spinnerBox);

				// Add CSS animation
				const styleTag = document.createElement("style");
				styleTag.innerHTML = `
				@keyframes spin {
				  0% { transform: rotate(0deg); }
				  100% { transform: rotate(360deg); }
				}`;
				document.head.appendChild(styleTag);
                var ENG_title 		= document.querySelector('#eng-title').value;
                var ENG_Cred 		= document.querySelector('#eng-cred').value;
                var ENG_description = document.querySelector('#eng-description').value;
				let productGrpElement= document.querySelector('#dropdown_ELGI_CA_ProductGroupType');
				let productGrpType;
				let productGrpOrginalVal;
				if(productGrpElement){
					productGrpOrginalVal	=	productGrpElement.value;
					productGrpType			=   productGrpOrginalVal.split('-')[0];	
					
				}
				let partType		= document.querySelector('#dropdown_ELGI_CA_PartType').value;
				let partCategory		= document.querySelector('#dropdown_ELGI_CA_PartCategory').value;
				let prodTypeselectEl	= document.querySelector('#dropdown_ELGI_CA_ProductGroupType');
				let productGrpTypeLabel;
				if(prodTypeselectEl){
					productGrpTypeLabel = prodTypeselectEl.options[prodTypeselectEl.selectedIndex].text;
				}
				let productLineEl	= document.querySelector('#dropdown_ELGI_CA_TPLProductLine');
				let productLine;
				if(productLineEl){
					productLine 	= document.querySelector('#dropdown_ELGI_CA_TPLProductLine').value;
				}
				console.log("Product Line :", productLine);
				if(partCategory === "Non-Standard Part"){
					/* if(!productLine){
						widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Line attribute!!', sticky: false });
						return;
					} */
					if(!productGrpType || productGrpType === "Unassigned"){
						widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Group Type attribute!!', sticky: false });
						return;
					}
				}
				if(!partCategory || partCategory === "Unassigned"){
					widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Part Category attribute!!', sticky: false });
					return;
				}
				if(!partType){
					widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Part Type attribute!!', sticky: false });
					return;
				}
				/* var updatedLabel	=	null;
				if(productLine.includes(" ")){
					updatedLabel	=	productLine.replace(/\s+/g, "");
				}else{
					updatedLabel	=	productLine;
				} */
				//let stage 			= document.querySelector('#dropdown_Stage').value;
				
				//let productGrp		= document.querySelector('#dropdown_'+productLine+'ProductGroup').value;
				const csrfTok = await YATGUtils.getCSRFToken();
				csrfToken = csrfTok;
				console.log("ENG_title==>", ENG_title);
				console.log("description===>", ENG_description);
				console.log("sec context=====>", ENG_Cred);
				console.log("bookMarkID====>",bookMarkID);
				console.log("csrfToken====>",csrfToken);
				
				const randomNum = getRandomNumber(); 
					
				let docNumValue;
				
				//docNumValue = `${productGrpType}-${productLine}-${randomNum}`;
				
				console.log("Doc Value:", docNumValue);
				if((typeof classIDToClassify !== 'undefined' && classIDToClassify) || (typeof classNonStdOID !== 'undefined' && classNonStdOID)){
					const engURL 					  = baseURL + '/resources/v1/modeler/dseng/dseng:EngItem';
					const createdItem				  = await createEngineeringItem(engURL, ENG_title, ENG_description,csrfToken,ENG_Cred);
					let searchKeyVal;
					switch(partCategory){
						case "Non-Standard Part" : {
							switch(partType){
								case "Assy":
								case "Assy_EG-EN":
								{
									if(!productGrpType || productGrpType === "UnAssigned"){
										widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Group attribute!!', sticky: false });
										return;
									}
									let sequence			  = "S"+productGrpType;
									//const getRunningNumberURL = baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									const getRunningNumberURL = customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									var nextNum				  = await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
									if(nextNum){
										searchKeyVal		  = sequence + nextNum;
									}
									break;
								}
								case "SubAssy":
								case "SubAssy_EG-EN":
								{
									if(!productGrpType){
										widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Group attribute!!', sticky: false });
										return;
									}
									let sequence			  = "X"+productGrpType;
									//const getRunningNumberURL = baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									const getRunningNumberURL = customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									var nextNum				  = await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
									if(nextNum){
										searchKeyVal		  = sequence + nextNum;
									}
									break;
								}
								case "SubSubAssy":
								case "SubSubAssy_EGEN":
								{
									if(!productGrpType){
										widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Group attribute!!', sticky: false });
										return;
									}
									let sequence			  = "A"+productGrpType;
									//const getRunningNumberURL = baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									const getRunningNumberURL = customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									var nextNum				  = await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
									if(nextNum){
										searchKeyVal		  = sequence + nextNum;
									}
									break;
								}
								case "NonStdAssy":{
									if(!productGrpType){
										widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'Please fill the Product Group attribute!!', sticky: false });
										return;
									}
									let sequence			  = "Z"+productGrpType;
									//const getRunningNumberURL = baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									const getRunningNumberURL = customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequence+"&PartType=SearchKey";
									var nextNum				  = await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
									if(nextNum){
										searchKeyVal		  = sequence + nextNum;
									}
									break;
								}
								default:{
									searchKeyVal			  = createdItem.name;
								}
							}
					
							break;
						}
						
						case "Bought-out Part" :{
							searchKeyVal			  = createdItem.name;
							break;
						}
					}
					
					console.log("searchKeyVal===>",searchKeyVal);
					console.log("createdItem===>",createdItem);
					const updateSearchKeyPayload	  = {
														  "dseno:EnterpriseAttributes" :{
															  "ELGI_CA_PartType"	: partType,
															  "ELGI_CA_SearchKeyII"	: searchKeyVal,
															  "ELGI_CA_ProductGroupType": productGrpOrginalVal
															},
														  "cestamp" : createdItem.cestamp
														};
					const updateSearchKeyURL 		  = baseURL + '/resources/v1/modeler/dseng/dseng:EngItem/'+createdItem.id;
					await updatePhysicalProduct(updateSearchKeyURL, csrfToken, updateSearchKeyPayload, ENG_Cred);
					//const classifyURL 				  = baseURL + '/resources/v1/modeler/dslib/dslib:CategorizationClassifiedItem';
					const classifyURL 				  = baseURL + '/resources/v1/modeler/dslib/dslib:ClassifiedItem';
					/* const getLibURL					  = baseURL + '/resources/v1/modeler/dslib/dslib:Library/search?$searchStr=PART LIBRARY';
					const strLibOID					  = await getELGILibrary(getLibURL,csrfToken,ENG_Cred); */
					let classIDToClassify			  = classToClassifyOID;
					//const getClassURL			  	  = baseURL + '/resources/v1/modeler/dslib/dslib:Library/'+strLibOID+'?$mask=dslib:ExpandClassesMask';
					//const resultMap		  		  	  = await getTPLAndSpecSheetClass(getClassURL,csrfToken,ENG_Cred);
					console.log("classIDToClassify===>",classIDToClassify);
					var einValue	;
					var boEINAttr		=	{};
					var nonStdEINAttr	=	{};
					nonStdEINAttr["ELGI_CA_ProductGroupType"] = productGrpOrginalVal;
					
					if(classIDToClassify){
						console.log("Created Item ID===>",createdItem.id);
						console.log("classIDToClassify===>",classIDToClassify);
						let classifyEngItemPayload	  = {
																ClassID: classIDToClassify,
																ObjectsToClassify: [
																	{
																		source: baseURL,
																		type: "dseng:EngItem",
																		identifier: createdItem.id,
																		relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${createdItem.id}`
																	}
																]
															};
						await classifyItem(classifyURL,csrfToken,classifyEngItemPayload,ENG_Cred);
						//var getClassifiedItemInfoURL		=	baseURL + '/resources/v1/modeler/dslib/dslib:CategorizationClassifiedItem/'+createdItem.id;
						var getClassifiedItemInfoURL		=	baseURL + '/resources/v1/modeler/dslib/dslib:ClassifiedItem/'+createdItem.id;
						var classifiedItemCEStampID			=	await getClassifiedItemCEStamp(getClassifiedItemInfoURL,csrfToken,ENG_Cred);
						console.log("classifiedItemCEStampID===>",classifiedItemCEStampID);
						if(classifiedItemCEStampID){
							console.log("classAttributesName====>",classAttributesName);
							let productInfo			  = await fetchEngineeringItemInfo(engURL,createdItem.id, csrfToken,ENG_Cred);
							var updatedCEStamp		  = productInfo.cestamp;
							const attrPayload = {};
							attrPayload["cestamp"] = updatedCEStamp;
							if(classAttributesName){
							  for (let attrName of classAttributesName) {
								console.log("attrName===>",attrName);
								const attrEl = document.getElementById("dropdown_" + attrName);
								let attrValue;
								if(attrEl){
									attrValue = document.getElementById("dropdown_" + attrName).value;
								}else{
									attrValue = document.getElementById(attrName).value;
								}
								 
								attrPayload[attrName] = attrValue;
								if(partCategory === "Bought-out Part"){
									if(attrName === "ELGI_CA_AccessoryIdentification" || attrName === "ELGI_CA_AccessoryMakeIdentification"){
										boEINAttr[attrName]	=	attrValue;
									}
								}
							  }
							}
							  if(partCategory === "Bought-out Part"){
								  var accessID				=	boEINAttr["ELGI_CA_AccessoryIdentification"];
								  var accessMakeID			=	boEINAttr["ELGI_CA_AccessoryMakeIdentification"];
								  if(accessID && accessMakeID){
									  var seqPattern			=	"B"+accessID+accessMakeID;
									 // const getRunningNumberURL = 	baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+seqPattern+"&PartType=BOUGHT-OUT";
									  const getRunningNumberURL = 	customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+seqPattern+"&PartType=BOUGHT-OUT";
									  var runningNo				= 	await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
									  if (!runningNo) {
										alert("Error fetching Running Number from DB");
										return;
									  }
									  if (runningNo.length > 4) {
										alert(`Boughtout Part Number limit exceeded`);
										return;
									  }
									  var newEIN	=	seqPattern + runningNo;
									  if (newEIN.length === 13) {
										const response = await callEINWebServiceAsync(createdItem.id, newEIN);
										if(response){
											console.log(`EIN updated for ${createdItem.id}: ${newEIN}`);
										}
									  }
								  }
							  }
							  //attrPayload["ELGI_CA_ProductGroupType"] = productGrpType;
							  /* if(partCategory === "Non-Standard Part"){
								attrPayload["ELGI_CA_TPLProductLine"]   = productLine;
							  } */

							  console.log("attrPayload==>", attrPayload);
							var updateClassifiedAttributeURL  = baseURL + '/resources/v1/modeler/dslib/dslib:ClassifiedItem/modify';
							/* var updateClassifiedAttrPayLoad	  = [
																  {
																	referencedObject: {
																	  source: baseURL,
																	  type: "dslib:ClassifiedItem",
																	  identifier: createdItem.id,
																	  relativePath: `resources/v1/modeler/dslib/dslib:ClassifiedItem/${createdItem.id}`
																	},
																	categorizationAttributes: [
																	  {
																		classId: classIDToClassify,
																		attributes: attrPayload
																	  }
																	]
																  }
																]; */
																
							var updateClassifiedAttrPayLoad = [
																  {
																	referencedObject: {
																	  source: baseURL,
																	  type: "dslib:ClassifiedItem",
																	  identifier: createdItem.id,
																	  relativePath: `resources/v1/modeler/dslib/dslib:ClassifiedItem/${createdItem.id}`
																	},
																	attributes: attrPayload
																  }
																];

							console.log("updateClassifiedAttrPayLoad==>",updateClassifiedAttrPayLoad);
							await updateClassifiedItemAttribute(updateClassifiedAttributeURL,csrfToken,updateClassifiedAttrPayLoad,ENG_Cred);
						}
					}
						
						const createDocURL 				  = baseURL + '/resources/v1/modeler/documents';
						const createDocPayload 			  = {
																data: [{
																	attributes: {
																		//name: "SpecSheet_" + Date.now(),
																		type: "Document",
																		policy: "Document Release",
																		"extensions": [
																			"XP_Document_Ext.DocumentType"
																		]
																	}
																}]
															};
						const createdDocResp			  = await createDocument(createDocURL, csrfToken, createDocPayload,ENG_Cred);
						const createdDocId				  = createdDocResp.id;
						const createdDocName			  = createdDocResp.dataelements.name;
						const updatePayload 			  = {
																data: [{
																	id: createdDocId,
																	type: "Document",
																	updateAction: "MODIFY",
																	"dataelements": {
																		"title" : createdDocName,
																		"ELGI_CA_DocumentType": "SpecSheet"
																	}
																}]
															};
						await updateDocument(createDocURL, csrfToken, updatePayload, ENG_Cred);
						/* const classifyDocumentPayload	  = {
															  ClassID: classSpecSheetOID, 
															  ObjectsToClassify: [
																{
																  source: baseURL, 
																  type: "Document", 
																  identifier: createdDocId, 
																  relativePath: "/resources/v1/modeler/documents/"+createdDocId
																}
															  ]
															};
						await classifyItem(classifyURL,csrfToken,classifyDocumentPayload,ENG_Cred); */
						const addSpecDocURL 			  = baseURL + '/resources/v1/modeler/documents/?disableOwnershipInheritance=1&parentRelName=SpecificationDocument&parentDirection=from';
						const addSpecDocPayload 		  = {
																csrf: {
																	name: 'ENO_CSRF_TOKEN',
																	value: csrfToken
																},
																data: [
																	{
																		id: createdDocId,
																		relateddata: {
																			parents: [
																				{
																					id: createdItem.id,
																					updateAction: 'CONNECT'
																				}
																			]
																		},
																		updateAction: 'NONE'
																	}
																]
															};
						await connectDocument(addSpecDocURL, csrfToken, addSpecDocPayload);
						const createSubSheetPayload 	  = {
																data: [{
																	attributes: {
																		//name: "SubSheet_" + Date.now(),
																		type: "Document",
																		
																		policy: "Document Release",
																		"extensions": [
																			"XP_Document_Ext.DocumentType"
																		]
																	}
																}]
															};
						const createdSubDocResp			  = await createDocument(createDocURL, csrfToken, createSubSheetPayload, ENG_Cred);
						const createdSubDocId			  = createdSubDocResp.id;
						const createdSubDocName			  = createdSubDocResp.dataelements.name;
						const updateSubPayload 			  = {
																data: [{
																	id: createdSubDocId,
																	type: "Document",
																	updateAction: "MODIFY",
																	"dataelements": {
																		"title": createdSubDocName,
																		"ELGI_CA_DocumentType": "SubSheet",
																		"ELGI_CA_DocumentName" : searchKeyVal
																	}
																}]
															};
						await updateDocument(createDocURL, csrfToken, updateSubPayload, ENG_Cred);
						/* const classifySubSheetPayload	  = {
															  ClassID: classSubSheetOID, 
															  ObjectsToClassify: [
																{
																  source: baseURL, 
																  type: "Document", 
																  identifier: createdSubDocId, 
																  relativePath: "/resources/v1/modeler/documents/"+createdSubDocId
																}
															  ]
															};
						await classifyItem(classifyURL,csrfToken,classifySubSheetPayload,ENG_Cred); */
						const addAttachedDocURL 		  = baseURL + '/resources/v1/modeler/documents/?disableOwnershipInheritance=1&parentRelName=Reference Document&parentDirection=from';

						const addAttachedDocPayload 	  = {
																csrf: {
																	name: 'ENO_CSRF_TOKEN',
																	value: csrfToken
																},
																data: [
																	{
																		id: createdSubDocId,
																		relateddata: {
																			parents: [
																				{
																					id: createdDocId,
																					updateAction: 'CONNECT'
																				}
																			]
																		},
																		updateAction: 'NONE'
																	}
																]
															};
						await connectDocument(addAttachedDocURL, csrfToken,addAttachedDocPayload);
						const createCRDPayload 			  = {
																data: [{
																		attributes: {
																			//name: "CRD_" + Date.now(),
																			type: "Document",

																			policy: "Document Release",
																			"extensions": [
																				"XP_Document_Ext.DocumentType"
																			]
																		}
																	}
																]
															};
						
						const createdCRDDocResp			  = await createDocument(createDocURL, csrfToken, createCRDPayload,ENG_Cred);
						const createdCRDDocId			  = createdCRDDocResp.id;
						const createdCRDDocName			  = createdCRDDocResp.dataelements.name;
						const updateCRDPayload			  = {
																data: [{
																		id: createdCRDDocId,
																		type: "Document",
																		updateAction: "MODIFY",
																		"dataelements": {
																			"title": createdCRDDocName,
																			"ELGI_CA_DocumentType": "CRD"
																		}
																	}
																]
															};
						await updateDocument(createDocURL, csrfToken, updateCRDPayload, ENG_Cred);
						const addSpecCRDpayload 		  = {
																csrf: {
																	name: 'ENO_CSRF_TOKEN',
																	value: csrfToken
																},
																data: [
																	{
																		id: createdDocId,
																		relateddata: {
																			parents: [
																				{
																					id: createdCRDDocId,
																					updateAction: 'CONNECT'
																				}
																			]
																		},
																		updateAction: 'NONE'
																	}
																]
															};
						await connectDocument(addAttachedDocURL, csrfToken,addSpecCRDpayload);
						const CRDpayloadForEngItem 		  = {
																csrf: {
																	name: 'ENO_CSRF_TOKEN',
																	value: csrfToken
																},
																data: [{
																		id: createdCRDDocId,
																		relateddata: {
																			parents: [{
																					id: createdItem.id,
																					updateAction: 'CONNECT'
																				}
																			]
																		},
																		updateAction: 'NONE'
																	}
																]
															};
						
						await connectDocument(addAttachedDocURL, csrfToken,CRDpayloadForEngItem);
						if(bookMarkID){
							let getFolderURL 				  = baseURL + '/resources/v1/modeler/projects/' + bookMarkID + '/folders';
							let   subFolderIDs				  = await getFolder(getFolderURL,csrfToken,ENG_Cred);
							console.log("subFolderIDs of EPSAC FOLDER====>",subFolderIDs);
							for (let i = 0; i < subFolderIDs.length; i++) {
								let getFolderDetailsURL	=	baseURL + '/resources/v1/modeler/dsbks/dsbks:Bookmark/'+subFolderIDs[i]+'?$mask=dsbks:BksMask.Details';
								let folderName			=	await getFolderName(getFolderDetailsURL,csrfToken,ENG_Cred);
								console.log("folderName===>",folderName);
								if(folderName.toLowerCase().includes("crd")){
									const bookMarkURL 			  = baseURL + '/resources/v1/FolderManagement/Folder/' + subFolderIDs[i] + '/content';
									var bookMarkPayLoad			  = JSON.stringify({
																		"IDs": createdCRDDocId
																	});
									await addDocToBookMark(bookMarkURL, csrfToken, createdCRDDocId, bookMarkPayLoad, ENG_Cred);
								}else if(folderName.toLowerCase().includes("specifications")){
									getFolderURL 				  = baseURL + '/resources/v1/modeler/projects/' + subFolderIDs[i] + '/folders';
									let specificationSubFolderIDs = await getFolder(getFolderURL,csrfToken,ENG_Cred);
									/* console.log("getFolderURL for SpecID	====>",getFolderURL);
									console.log("subFolderIDs of SPECIFICATION FOLDER====>",specificationSubFolderIDs); */
									for (let j = 0; j < specificationSubFolderIDs.length; j++){
										let getSpecFolderDetailsURL	=	baseURL + '/resources/v1/modeler/dsbks/dsbks:Bookmark/'+specificationSubFolderIDs[j]+'?$mask=dsbks:BksMask.Details';
										let specFolderName			=	await getFolderName(getSpecFolderDetailsURL,csrfToken,ENG_Cred);
										console.log("specFolderName===>",specFolderName);
										if(specFolderName.toLowerCase().includes("spec sheet")){
											const bookMarkURL 			  = baseURL + '/resources/v1/FolderManagement/Folder/' + specificationSubFolderIDs[j] + '/content';
											var bookMarkPayLoad			  = JSON.stringify({
																				"IDs": createdDocId
																			});
											await addDocToBookMark(bookMarkURL, csrfToken, createdDocId, bookMarkPayLoad, ENG_Cred);
										}else if(specFolderName.toLowerCase().includes("sub sheet")){
											const bookMarkURL 			  = baseURL + '/resources/v1/FolderManagement/Folder/' + specificationSubFolderIDs[j] + '/content';
											var bookMarkPayLoad			  = JSON.stringify({
																				"IDs": createdSubDocId
																			});
											await addDocToBookMark(bookMarkURL, csrfToken, createdSubDocId, bookMarkPayLoad, ENG_Cred);
										}
									}
								}
							}
						}
					
						if(classNonStdOID){
							console.log("Inside classifying Non-Standard Part!!!!!!!!!");
							console.log("Created Item ID===>",createdItem.id);
							console.log("classNonStdOID===>",classNonStdOID);
							let classifyEngItemPayload	  = {
																	ClassID: classNonStdOID,
																	ObjectsToClassify: [
																		{
																			source: baseURL,
																			type: "dseng:EngItem",
																			identifier: createdItem.id,
																			relativePath: `/resources/v1/modeler/dseng/dseng:EngItem/${createdItem.id}`
																		}
																	]
																};
							await classifyItem(classifyURL,csrfToken,classifyEngItemPayload,ENG_Cred);
							//var getClassifiedItemInfoURL		=	baseURL + '/resources/v1/modeler/dslib/dslib:CategorizationClassifiedItem/'+createdItem.id;
							var getClassifiedItemInfoURL		=	baseURL + '/resources/v1/modeler/dslib/dslib:ClassifiedItem/'+createdItem.id;
							var classifiedItemCEStampID			=	await getClassifiedItemCEStamp(getClassifiedItemInfoURL,csrfToken,ENG_Cred);
							console.log("classifiedItemCEStampID===>",classifiedItemCEStampID);
							if(classifiedItemCEStampID){
								console.log("classNonStdAttributesName====>",classNonStdAttributesName);
								
								const attrPayload = {};
								  for (let attrName of classNonStdAttributesName) {
									const attrEl = document.getElementById("dropdown_" + attrName);
									let attrValue;
									if(attrEl){
										attrValue = document.getElementById("dropdown_" + attrName).value;
									}else{
										attrValue = document.getElementById(attrName).value;
									}
									switch(productGrpTypeLabel){
										case "51-Foundry":{
											nonStdEINAttr[attrName]	=	attrValue;
											break;
										}
										default:{
											if(attrName.includes("ItemCategory")){
												nonStdEINAttr["ItemCategory"]	=	attrValue;
											}else{
												nonStdEINAttr[attrName]	=	attrValue;
											}
										}
									}
									
									attrPayload[attrName] = attrValue;
								  }

								  console.log("attrPayload==>", attrPayload);
								  if(productGrpTypeLabel === "51-Foundry"){
									  var manualRunningNo	=	nonStdEINAttr["ELGI_CA_ManualPartNo"];
									  console.log("manualRunningNo===>",manualRunningNo);
									  var sequenceKey;
									  var newEIN;
									  if(manualRunningNo){
										  newEIN			=	manualRunningNo;
									  }else{
										const partItemType 		= nonStdEINAttr["ELGI_CA_FouItemType"];
										const processOrGuide 	= nonStdEINAttr["ELGI_CA_FouProcessOrGuide"];
										const customerOrMake 	= nonStdEINAttr["ELGI_CA_FouCustomerOrMake"];
										if (!partItemType) {
											alert("Please fill the Part Item Type attribute for " + objName);
											return;
										}
										if (!processOrGuide) {
											alert("Please fill the Process/Grade attribute for " + objName);
											return;
										}
										if (!customerOrMake) {
											alert("Please fill the Customer/Make attribute for " + objName);
											return;
										}
										sequenceKey				= `${partItemType}-${processOrGuide}-${customerOrMake}-`;
									  }
									  if(newEIN){
										  const response = await callEINWebServiceAsync(createdItem.id, newEIN);
										  if(response){
											  console.log(`EIN updated for ${createdItem.id}: ${newEIN}`);
										  }
									  }else{
										  //const getRunningNumberURL = 	baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequenceKey+"&PartType=FOUNDRY";
										  const getRunningNumberURL = 	customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequenceKey+"&PartType=FOUNDRY";
										  var runningNo				= 	await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
										  if (!runningNo) {
											alert("Error fetching Running Number from DB");
											return;
										  }
										  newEIN				=	sequenceKey + runningNo;
										  if (runningNo.length > 4) {
											alert(`FOUNDRY Part Number  limit exceeded `);
											return;
										  }
										   
										const response = await callEINWebServiceAsync(createdItem.id, newEIN);
										 if(response){
											  console.log(`EIN updated for ${createdItem.id}: ${newEIN}`);
										  }
										   
									  } 
								  
								  }else{
									  //var productGroup		=	nonStdEINAttr["ELGI_CA_ProductGroupType"];
									  var productGroup		=	productGrpType;
									  var itemCategory		=	nonStdEINAttr["ItemCategory"];
									  var drawingReference	=	nonStdEINAttr["ELGI_CA_DrawingSizeStandardReference"];
									  var variant			=	nonStdEINAttr["ELGI_CA_Variant"];
									  var sub_runningNo		=	nonStdEINAttr["ELGI_CA_SubRunningSeries"];
									  var sequenceKey;
									  var newEIN;
									  if (variant && variant.toLowerCase() !== "unassigned") {
										var manualRunningNo	=	nonStdEINAttr["ELGI_CA_ManualPartNo"];
										if(!manualRunningNo){
											alert("Please fill the Manual Running Number!");
											return;
										}
										newEIN = productGroup + itemCategory + drawingReference + manualRunningNo + sub_runningNo;
									  } else {
										sequenceKey = productGroup + itemCategory + drawingReference + sub_runningNo;
									  }
									  if(newEIN){
										  const response = await callEINWebServiceAsync(createdItem.id, newEIN);
										  if(response){
											  console.log(`EIN updated for ${createdItem.id}: ${newEIN}`);
										  }
									  }else{
										  //const getRunningNumberURL = 	baseURL.replace("/3dspace","") + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequenceKey+"&PartType=NON-STANDARD";
										  const getRunningNumberURL = 	customConfigurationJSON["CustomURL"].CustomDBDomainURL + '/mywebapp/api/hello/getNextSequenceNumber?SeriesName='+sequenceKey+"&PartType=NON-STANDARD";
										  var runningNo				= 	await getRunningNumber(getRunningNumberURL, csrfToken,ENG_Cred);
										  if (!runningNo) {
											alert("Error fetching Running Number from DB");
											return;
										  }
										  newEIN				=	sequenceKey + runningNo;
										  const runningNoLength = 9 - sequenceKey.length;
										  if (runningNo.length > runningNoLength) {
											alert(`Non-Standard Part Number  limit exceeded `);
											return;
										  }
										   if (newEIN.length === 9) {
												const response = await callEINWebServiceAsync(createdItem.id, newEIN);
												 if(response){
													  console.log(`EIN updated for ${createdItem.id}: ${newEIN}`);
												  }
										   }
									  }  
								  }
								 
								//var updateClassifiedAttributeURL  = baseURL + '/resources/v1/modeler/dslib/dslib:CategorizationClassifiedItem/modify';
								var updateClassifiedAttributeURL  = baseURL + '/resources/v1/modeler/dslib/dslib:ClassifiedItem/modify';
								/* var updateClassifiedAttrPayLoad	  = [
																	  {
																		referencedObject: {
																		  source: baseURL,
																		  type: "dslib:ClassifiedItem",
																		  identifier: createdItem.id,
																		  relativePath: `resources/v1/modeler/dslib/dslib:ClassifiedItem/${createdItem.id}`
																		},
																		categorizationAttributes: [
																		  {
																			classId: classNonStdOID,
																			attributes: attrPayload
																		  }
																		]
																	  }
																	]; */
								let productInfo1			  	= await fetchEngineeringItemInfo(engURL,createdItem.id, csrfToken,ENG_Cred);
								var updatedCEStamp1		  		= productInfo1.cestamp;
								attrPayload["cestamp"] 			= updatedCEStamp1;
								var updateClassifiedAttrPayLoad = [
																	  {
																		referencedObject: {
																		  source: baseURL,
																		  type: "dslib:ClassifiedItem",
																		  identifier: createdItem.id,
																		  relativePath: `resources/v1/modeler/dslib/dslib:ClassifiedItem/${createdItem.id}`
																		},
																		attributes: attrPayload
																	  }
																	];
								console.log("updateClassifiedAttrPayLoad for Non-Std Part==>",updateClassifiedAttrPayLoad);
								await updateClassifiedItemAttribute(updateClassifiedAttributeURL,csrfToken,updateClassifiedAttrPayLoad,ENG_Cred);
							}
						}
						
					}else{
						widget.NotificationsUtil.handler().addNotif({ level: 'error', subtitle:'The specified Product Group type "'+productGrpTypeLabel+'" is not defined in the class !!!', sticky: false });
						spinnerOverlay.remove(); 
						return;
					}
					spinnerOverlay.remove(); 
					widget.NotificationsUtil.handler().addNotif({ level: 'success', subtitle:'The TPL Object '+ENG_title+' created and classified under the Class TPL successfully!', sticky: false });
				
				
                document.body.removeChild(overlay);
            });

            YATGUtils.getURLs().then(spaceurl => {
                _baseURL = spaceurl.url;
                console.log("this is base usl", _baseURL);
            }).catch(err => {
                console.error("Error fetching Space URL:", err);
            });
            YATGUtils.getCredentialsList()
                .then(credentialsList => {
                    console.log(_baseURL);
                    console.log("Credentials List:", credentialsList);

                    const credentialsSelect = document.querySelector('#eng-cred');

                    credentialsList.forEach(cred => {
                        const option = document.createElement('option');
                        option.value = cred.value;
                        option.textContent = cred.withoutOrgNls;
                        credentialsSelect.appendChild(option);
                    });
                })
                .catch(err => {
                    console.error("Error fetching credentials list:", err);
                });

        },
		callENGNewItemSer: function (spaceUrl, secContext, csrfToken, data) {

            return new Promise(function (resolve, reject) {
                var vURL = spaceUrl + '/resources/v1/modeler/dseng/dseng:EngItem?$fields=dsmveno:CustomerAttributes&$mask=dskern:Mask.Default';
                fetch(vURL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'ENO_CSRF_TOKEN': csrfToken,
                        'SecurityContext': secContext
                    },
                    body: JSON.stringify(data)
                })
                    .then(res => res.json())
                    .then(res => {
                        console.log("Fetch result", res);
                        const obj = res.member[0];
                        console.log("Fetch result", obj);
                        widget.NotificationsUtil.handler().addNotif({ level: 'success', subtitle: `Design Philosophy Created Successfully \n title : ${obj.title} \n name : ${obj.name} `, sticky: true });
                        Application.InitiateApplication(obj.id);
                    })
                    .catch(err => {
                        console.error("Fetch error", err);
                    });
            });
        },

        createElementWithClass: function (tag, classNames) {
            const element = document.createElement(tag);
            if (classNames) element.classList.add(...classNames.split(" "));
            return element;
        },
		
		openBookMark: function (e) {
			var current = this;
			var t = {
				engItemId: e[0].id,
				title: e[0]["ds6w:label"],
				partNumber: e[0]["ds6w:label_value"],
				maturityStatus: e[0]["ds6w:status"],
				modificationDate: e[0]["ds6w:modified"],
				revision: e[0]["ds6wg:revision"],
				type: e[0]["ds6w:type_value"],
				objName: e[0]["ds6w:identifier"],
			};
			console.log("Selected Item Information===>");
			console.log(e[0]);
			const textField = form.querySelector('input[type="text"]#bookmark');
			textField.value = t.title;
			/* //VPMReferenceID 	= t.engItemId;
			VPMReferenceDetails.VPMReferenceID			=	t.engItemId;
			VPMReferenceDetails.VPMReferenceDisplayName	=	t.title;
			const searchButton = form.querySelector('button[type="button"]#searchBOM');
			searchButton.disabled = true; */

		}

    };

    return Application;
});

define('Solize/View/Loader/NewChooser', ['DS/SNInfraUX/SearchCom'], function (SearchCom) {
    var NewChooser = {
        launchContextSearch: function (current) {
            var searchcom_socket;
            var socket_id = UWA.Utils.getUUID();
            var refinement = {
                "title": "",
                "role": "",
                "mode": "furtive",
                "default_with_precond": true,
                "show_precond": false,
                "precond": "flattenedtaxonomies:\"types/Workspace\" OR flattenedtaxonomies:\"types/Workspace Vault\"",
                "multiSel": false,
                "idcard_activated": false,
                "select_result_max_idcard": false,
                "itemViewClickHandler": "",
                "app_socket_id": socket_id,
                "widget_id": socket_id,
                "search_delegation": "3dsearch",
                "default_search_criteria": "",
                "source": ["3dspace"],
                "columns": [],
                "tenant": "OnPremise",
                "resourceid_not_in": [],
                "resourceid_in": []
            };
            if (!UWA.is(searchcom_socket)) {

                searchcom_socket = SearchCom.createSocket({
                    socket_id: socket_id
                });
                if (UWA.is(searchcom_socket)) {
                    searchcom_socket.dispatchEvent('RegisterContext', refinement);
                    searchcom_socket.addListener('Selected_Objects_search', function (e) {
                        //console.log("Selected Object===>",e);
						var t = {
							Id: e[0].id,
							title: e[0]["ds6w:label"],
							partNumber: e[0]["ds6w:label_value"],
							maturityStatus: e[0]["ds6w:status"],
							modificationDate: e[0]["ds6w:modified"],
							revision: e[0]["ds6wg:revision"],
							type: e[0]["ds6w:type_value"],
							objName: e[0]["ds6w:identifier"],
						};
						console.log("Selected Item Information===>");
						console.log(e[0]);
						const textField = document.querySelector('input[type="text"]#bookmark');
						textField.value = t.title;
						bookMarkID		= t.Id;
						console.log("bookMarkID====>"+bookMarkID);
                    });
                    searchcom_socket.dispatchEvent('InContextSearch', refinement);
                } else {
                    throw new Error('Socket not initialized');
                }
            }
        }
    }

    return NewChooser;
});

