/*!
 * OpenUI5
 * (c) Copyright 2009-2019 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/fl/Utils","sap/base/util/uid","sap/ui/base/ManagedObjectObserver"],function(e,t,n){"use strict";var o={};o.applyChange=function(t,o,r){if(r.modifier.targets!=="jsControlTree"){throw new Error("Combine buttons change can't be applied on XML tree")}var a=t.getDefinition(),i=r.modifier,g=e.getViewForControl(o),c=i.bySelector(a.content.combineButtonSelectors[0],r.appComponent),u=r.appComponent,s=i.getParent(c),p,d,m,l=sap.ui.getCore().getConfiguration().getRTL(),f,b,C=[],I={menuButtonId:"",parentAggregation:"",insertIndex:0};m=a.content.combineButtonSelectors.map(function(e){return i.bySelector(e,u)});d=m[0].sParentAggregationName;I.parentAggregation=d;p=i.findIndexInParentAggregation(c);I.insertIndex=p;f=i.createControl("sap.m.Menu",r.appComponent,g,a.content.menuIdSelector);m.forEach(function(e,t){var o,c,u=e.getBindingInfo("enabled"),p=e.getAggregation("customData"),m=a.content.buttonsIdForSave[t],b=i.getProperty(e,"text");c=i.createControl("sap.m.MenuItem",r.appComponent,g,m);i.setProperty(c,"text",e.mProperties.text);i.setProperty(c,"icon",e.mProperties.icon);i.setProperty(c,"enabled",e.mProperties.enabled);c.attachPress(function(t){return e.firePress(t)});e.getCustomData=function(){return e.getAggregation("customData").length?e.getAggregation("customData"):c.getCustomData()};new n(function(e){i.setProperty(c,"enabled",e.current);if(u){c.bindProperty("enabled",u)}}).observe(e,{properties:["enabled"]});if(u){c.bindProperty("enabled",u)}if(b){l?C.unshift(b):C.push(b)}m.id=m.id+"-originalButtonId";o=i.createControl("sap.ui.core.CustomData",r.appComponent,g,m);i.setProperty(o,"key","originalButtonId");i.setProperty(o,"value",i.getId(e));if(p&&p.length>0){p.forEach(function(e,t){i.insertAggregation(c,"customData",e,t)})}i.removeAggregation(s,d,e);i.insertAggregation(c,"dependents",e);i.insertAggregation(c,"customData",o,0);i.insertAggregation(f,"items",c,t)});b=i.createControl("sap.m.MenuButton",r.appComponent,g,a.content.menuButtonIdSelector);I.menuButtonId=i.getId(b);i.setProperty(b,"text",C.join("/"));i.insertAggregation(b,"menu",f,0);i.insertAggregation(s,d,b,p);t.setRevertData(I);return true};o.revertChange=function(e,t,n){var o=n.modifier,r=e.getRevertData(),a=e.getDefinition(),i=r.parentAggregation,g=r.insertIndex,c=o.bySelector(r.menuButtonId,n.appComponent),u=o.getParent(c),s=a.content.combineButtonSelectors;for(var p=0;p<s.length;p++){var d=o.bySelector(s[p],n.appComponent);o.insertAggregation(u,i,d,g+p)}o.removeAggregation(u,i,c);c.destroy();e.resetRevertData();return true};o.completeChangeContent=function(e,n,o){var r=o.modifier,a=o.appComponent,i=e.getDefinition(),g=n.combineFieldIds;if(g&&g.length>=2){e.addDependentControl(g,"combinedButtons",o);i.content.combineButtonSelectors=g.map(function(e){return r.getSelector(e,a)});i.content.menuButtonIdSelector=r.getSelector(a.createId(t()),a);i.content.menuIdSelector=r.getSelector(a.createId(t()),a);i.content.buttonsIdForSave=g.map(function(){return r.getSelector(a.createId(t()),a)})}else{throw new Error("Combine buttons action cannot be completed: oSpecificChangeInfo.combineFieldIds attribute required")}};return o},true);