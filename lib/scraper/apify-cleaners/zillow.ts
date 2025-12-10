/**
 * Zillow-specific JSON cleaner
 * Removes unnecessary fields from Zillow Apify JSON responses
 */

/**
 * Clean Zillow Apify JSON by removing unnecessary fields
 * 
 * @param apifyJson - The raw Apify JSON response from Zillow scraper
 * @returns Cleaned JSON with unnecessary fields removed
 */
export function cleanZillowJson(apifyJson: any): any {
  if (!apifyJson) {
    return apifyJson
  }

  // Handle the case where JSON has apifyData wrapper (like sample file format)
  if (apifyJson.apifyData && Array.isArray(apifyJson.apifyData)) {
    return {
      ...apifyJson,
      apifyData: apifyJson.apifyData.map((item: any) => cleanZillowItem(item))
    }
  }

  // If it's an array (direct Apify response), clean each item
  if (Array.isArray(apifyJson)) {
    return apifyJson.map(item => cleanZillowItem(item))
  }

  // If it's a single object, clean it
  if (typeof apifyJson === 'object') {
    return cleanZillowItem(apifyJson)
  }

  return apifyJson
}

/**
 * Clean a single Zillow Apify item by removing unnecessary fields
 */
function cleanZillowItem(item: any): any {
  if (!item || typeof item !== 'object') {
    return item
  }

  const cleaned: any = { ...item }

  // Remove submitFlow field (if it exists)
  if ('submitFlow' in cleaned) {
    delete cleaned.submitFlow
  }

  // Remove collections field (if it exists)
  if ('collections' in cleaned) {
    delete cleaned.collections
  }

  // Remove other unnecessary fields that are typically not needed
  const fieldsToRemove = [
    'collections',
    'rentalApplicationsAcceptedType',
    'foreclosureBalanceReportingDate',
    'housesForRentInZipcodeSearchUrl',
    'isCurrentSignedInAgentResponsible',
    'isCurrentSignedInUserVerifiedOwner',
    'apartmentsForRentInZipcodeSearchUrl',
    'hasApprovedThirdPartyVirtualTourUrl',
    'streetViewTileImageUrlMediumAddress',
    'streetViewTileImageUrlMediumLatLong',
    'isListingClaimedByCurrentSignedInUser',
    'streetViewMetadataUrlMediaWallAddress',
    'streetViewMetadataUrlMediaWallLatLong',
    'streetViewMetadataUrlMapLightboxAddress',
    'displayed_agents',
    'fallback_form',
    'hidden_fields',
    'hide_textarea',
    'request_trace',
    'tour_eligible',
    'authentication',
    'lender_details',
    'display_options',
    // Property page unnecessary fields
    'ouid',
    'ssid',
    'zpid',
    'mlsid',
    'thumb',
    'hdpUrl',
    'brokerId',
    'building',
    'schools',
    'parcelId',
    'adTargets',
    'guid',
    'hood',
    'mlong',
    'yrblt',
    'listtp',
    'prange',
    'proptp',
    'aamgnrc1',
    'aamgnrc2',
    'sqftrange',
    'premieragent',
    'serviceversion',
    'boroughId',
    'bodyType',
    'electric',
    'parkName',
    'listingId',
    'tenantPays',
    'topography',
    'vegetation',
    'woodedArea',
    'builderName',
    'commonWalls',
    'contingency',
    'exclusions',
    'fireplaces',
    'inclusions',
    'entryLevel',
    'otherFacts',
    'otherParking',
    'poolFeatures',
    'storiesTotal',
    'entryLocation',
    'marketingType',
    'ownershipType',
    'petsMaxWeight',
    'structureType',
    'waterBodyName',
    'associationFee2',
    'associationName2',
    'associationPhone',
    'associationPhone2',
    'availabilityDate',
    'bathroomsPartial',
    'buildingFeatures',
    'elementarySchool',
    'exteriorFeatures',
    'interiorFeatures',
    'securityFeatures',
    'taxAssessedValue',
    'additionalFeeInfo',
    'communityFeatures',
    'developmentStatus',
    'fireplaceFeatures',
    'foundationDetails',
    'highSchoolDistrict',
    'mainLevelBedrooms',
    'mainLevelBathrooms',
    'waterfrontFeatures',
    'yearBuiltEffective',
    'bathroomsOneQuarter',
    'compensationBasedOn',
    'greenSustainability',
    'hasAttachedProperty',
    'numberOfUnitsVacant',
    'openParkingCapacity',
    'associationAmenities',
    'greenEnergyEfficient',
    'hasAdditionalParcels',
    'livingAreaRangeUnits',
    'middleOrJuniorSchool',
    'accessibilityFeatures',
    'bathroomsThreeQuarter',
    'constructionMaterials',
    'garageParkingCapacity',
    'greenEnergyGeneration',
    'greenIndoorAirQuality',
    'hasElectricOnProperty',
    'patioAndPorchFeatures',
    'aboveGradeFinishedArea',
    'belowGradeFinishedArea',
    'carportParkingCapacity',
    'coveredParkingCapacity',
    'cumulativeDaysOnMarket',
    'greenWaterConservation',
    'irrigationWaterRightsYN',
    'landLeaseExpirationDate',
    'elementarySchoolDistrict',
    'numberOfUnitsInCommunity',
    'specialListingConditions',
    'irrigationWaterRightsAcres',
    'additionalParcelsDescription',
    'middleOrJuniorSchoolDistrict',
    'greenBuildingVerificationType',
    'richMedia',
    'scrapedAt',
    'whatILove',
    'homeValues',
    'isFeatured',
    'livingArea',
    'lotPremium',
    'photoCount',
    'postingUrl',
    'taxHistory',
    'nearbyHomes',
    'attributionInfo',
    'listingMetadata',
    'priceHistory',
    'priceChange',
    'sellingSoon',
    'treatmentId',
    'percentile',
    'zipPlusFour',
    'communityUrl',
    'onsiteMessage',
    'placementId',
    'surfaceId',
    'flexibleLayout',
    'isAdsRestricted',
    'qualifiedTreatments',
    'pageViewCount',
    'tourViewCount',
    'hasPublicVideo',
    'hiResImageLink',
    'listingAccount',
    'listingSubType',
    'isPending',
    'isBankOwned',
    'isOpenHouse',
    'isComingSoon',
    'isForAuction',
    'isForeclosure',
    'foreclosingBank',
    'foreclosureDate',
    'listingProvider',
    'propertyTaxRate',
    'richMediaVideos',
    'tourEligibility',
    'tourAvailability',
    'isPropertyTourEligible',
    'datePostedString',
    'foreclosureTypes',
    'hdpTypeDimension',
    'isPremierBuilder',
    'listingsubtype',
    'isnewHome',
    'ispending',
    'isbankOwned',
    'isopenHouse',
    'iscomingSoon',
    'isforAuction',
    'isforeclosure',
    'mortgageZHLRates',
    'responsivePhotos',
    'subjectType',
    'originalPhotos',
    'postingContact',
    'virtualTourUrl',
    'ZoDsFsUpsellTop',
    'display',
    'placementName',
    'shouldDisplay',
    'decisionContext',
    'leadType',
    'leadTypes',
    'listPrice',
    'monthlyHoaFee',
    'hideZestimate',
    'isZillowOwned',
    'lastSoldPrice',
    'listingFeedID',
    'marketingName',
    'mortgageRates',
    'operatingSystem',
    'shouldDisplayUpsell',
    'hideMortgageAdDetailPage',
    'isGlobalHoldout',
    'selectedTreatment',
    'renderingProps',
    'overrideMargin0px',
    'hasBorderfalse',
    'actionLink',
    'actionText',
    'actionType',
    'actionButtonType',
    'secondaryActionLink',
    'secondaryActionText',
    'secondaryActionType',
    'secondaryActionButtonType',
    'skipDisplayReason',
    'isPlacementHoldout',
    'streetViewServiceUrl',
    'contactFormRenderData',
    'formidentifier',
    'brokerageproduct',
    'title',
    'listing',
    'oneadvisor',
    'directconnect',
    'toureligiblev2',
    'contactagenteligiblev2',
    'encodedzuid',
    'recentsales',
    'reviewcount',
    'businessname',
    'ratingaverage',
    'servicesoffered',
    'writereviewurl',
    'kellerwilliams',
    'infoboxvisible',
    'displayedlenders',
    'contactrecipients',
    'haspal',
    'badgetype',
    'firstname',
    'imagedata',
    'profileurl',
    'reviewsurl',
    'agentreason',
    'displayname',
    'hascaliberpal',
    'haswellsfargopal',
    'contactbuttontext',
    'regionphonenumber',
    'desktopphonenumber',
    'zhlprimaryctaeligible',
    'brokerageinfomustbeshown',
    'instantbookregion',
    'supportsunselectedleads',
    'variant',
    'pixelid',
    'opaquela',
    'pixelurl',
    'textarea',
    'textfields',
    'intl',
    'tourconfig',
    'agentmodule',
    'zpro',
    'phone',
    'prefix',
    'areacode',
    'apifyScraperId',
  ]

  fieldsToRemove.forEach(field => {
    if (field in cleaned) {
      delete cleaned[field]
    }
  })

  // Handle nested fields in vrModel
  if ('vrModel' in cleaned && cleaned.vrModel && typeof cleaned.vrModel === 'object') {
    if ('revisionId' in cleaned.vrModel) {
      delete cleaned.vrModel.revisionId
    }
    if ('vrModelGuid' in cleaned.vrModel) {
      delete cleaned.vrModel.vrModelGuid
    }
  }

  // Handle nested fields in resoFacts
  if ('resoFacts' in cleaned && cleaned.resoFacts && typeof cleaned.resoFacts === 'object') {
    if ('gas' in cleaned.resoFacts) {
      delete cleaned.resoFacts.gas
    }
    if ('attic' in cleaned.resoFacts) {
      delete cleaned.resoFacts.attic
    }
  }

  // Handle nested fields in rooms array
  if ('resoFacts' in cleaned && cleaned.resoFacts && typeof cleaned.resoFacts === 'object') {
    if ('rooms' in cleaned.resoFacts && Array.isArray(cleaned.resoFacts.rooms)) {
      cleaned.resoFacts.rooms = cleaned.resoFacts.rooms.map((room: any) => {
        if (typeof room === 'object' && room !== null) {
          const cleanedRoom: any = { ...room }
          const roomFieldsToRemove = [
            'area',
            'level',
            'features',
            'roomArea',
            'roomWidth',
            'dimensions',
            'roomLength',
            'description',
            'roomAreaSource',
            'roomDimensions',
            'roomDescription',
            'roomLengthWidthSource',
          ]
          roomFieldsToRemove.forEach(field => {
            if (field in cleanedRoom) {
              delete cleanedRoom[field]
            }
          })
          return cleanedRoom
        }
        return room
      })
    }
  }

  // Process staticMap - extract latitude and longitude from Google Maps URL
  if ('staticMap' in cleaned && cleaned.staticMap) {
    const staticMapData = cleaned.staticMap
    let latitude: number | null = null
    let longitude: number | null = null

    // Try to extract from staticMap.sources[0].url
    if (staticMapData.sources && Array.isArray(staticMapData.sources) && staticMapData.sources.length > 0) {
      const firstUrl = staticMapData.sources[0]?.url
      if (firstUrl && typeof firstUrl === 'string') {
        // Extract center parameter from URL: center=18.442053,-66.06174
        const centerMatch = firstUrl.match(/center=([^&]+)/)
        if (centerMatch && centerMatch[1]) {
          const coords = centerMatch[1].split(',')
          if (coords.length >= 2) {
            const lat = parseFloat(coords[0])
            const lng = parseFloat(coords[1])
            // Only set if both are valid numbers
            if (!isNaN(lat) && !isNaN(lng)) {
              latitude = lat
              longitude = lng
            }
          }
        }
      }
    }

    // Replace staticMap with simplified object containing only lat/lng
    cleaned.staticMap = {
      latitude: latitude || null,
      longitude: longitude || null,
    }
  }

  // Process mixedSources - keep only the largest image for each format (webp and jpeg/jpg)
  if ('mixedSources' in cleaned && cleaned.mixedSources && typeof cleaned.mixedSources === 'object') {
    const mixedSources = cleaned.mixedSources
    const processed: any = {}

    // Process each format (webp, jpeg, jpg)
    for (const format in mixedSources) {
      if (format === 'webp' || format === 'jpeg' || format === 'jpg') {
        const images = mixedSources[format]
        if (Array.isArray(images) && images.length > 0) {
          // Find the image with the largest width
          const largestImage = images.reduce((max, img) => {
            const maxWidth = max?.width || 0
            const imgWidth = img?.width || 0
            return imgWidth > maxWidth ? img : max
          }, images[0])

          // Keep only the largest image
          processed[format] = [largestImage]
        } else {
          processed[format] = images
        }
      } else {
        // Keep other formats as-is
        processed[format] = mixedSources[format]
      }
    }

    cleaned.mixedSources = processed
  }

  // Recursively clean nested objects (but skip staticMap and mixedSources since we already processed them)
  for (const key in cleaned) {
    if (key === 'staticMap' || key === 'mixedSources') {
      // Skip staticMap and mixedSources - we already processed them
      continue
    }
    
    if (cleaned[key] && typeof cleaned[key] === 'object') {
      if (Array.isArray(cleaned[key])) {
        cleaned[key] = cleaned[key].map((nestedItem: any) => {
          if (typeof nestedItem === 'object' && nestedItem !== null) {
            return cleanZillowItem(nestedItem)
          }
          return nestedItem
        })
      } else {
        cleaned[key] = cleanZillowItem(cleaned[key])
      }
    }
  }

  // Remove empty values (null, undefined, empty strings, empty arrays, empty objects)
  const finalCleaned: any = {}
  for (const key in cleaned) {
    const value = cleaned[key]
    
    // Skip null, undefined, and empty strings
    if (value === null || value === undefined || value === '') {
      continue
    }
    
    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) {
      continue
    }
    
    // Skip empty objects
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue
    }
    
    // Clean arrays - remove empty items
    if (Array.isArray(value)) {
      const cleanedArray = value.filter(v => {
        if (v === null || v === undefined || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false
        return true
      })
      if (cleanedArray.length > 0) {
        finalCleaned[key] = cleanedArray
      }
    } else if (typeof value === 'object' && value !== null) {
      // Clean nested objects - remove empty properties
      const cleanedObject: any = {}
      for (const nestedKey in value) {
        const nestedValue = value[nestedKey]
        if (nestedValue === null || nestedValue === undefined || nestedValue === '') continue
        if (Array.isArray(nestedValue) && nestedValue.length === 0) continue
        if (typeof nestedValue === 'object' && !Array.isArray(nestedValue) && Object.keys(nestedValue).length === 0) continue
        cleanedObject[nestedKey] = nestedValue
      }
      if (Object.keys(cleanedObject).length > 0) {
        finalCleaned[key] = cleanedObject
      }
    } else {
      // Keep primitive values (string, number, boolean, etc.)
      finalCleaned[key] = value
    }
  }

  return finalCleaned
}
