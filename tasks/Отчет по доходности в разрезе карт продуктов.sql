SELECT 
    ID, 
    /*
        Поля для доп. информации
    */
    PRODUCT_NAME,
    PRODUCT_CODE_PC,
    PAN,
    DATE_BEGIN,
    DATE_CLOSE,
    STATE,
    (CASE WHEN lower(PRODUCT_NAME) like '%mfk%' or lower(PRODUCT_NAME) like '%мфк%' THEN 1 ELSE 0 END) MFK,
    (CASE WHEN lower(PRODUCT_NAME) like '%зарплат%' or lower(PRODUCT_NAME) like '%zp%' or lower(PRODUCT_NAME) like '%зп%' or lower(PRODUCT_NAME) like '%сотрудник%' THEN 1 ELSE 0 END) ZP,

    /* 
        Ранжирование карт по продуктам в отчете. 1 - может стоять только в одном из идущих ниже полей, остальные поля должны быть - 0
        Проверка правильности отнесения карт:
        select * from V_CARDS_BY_PRODUCTS
            where (MIR + VISA_ELECTRON + VISA_CLASSIC + VISA_GOLD + VISA_PLATINUM + VISA_INFINITE + VISA_K_N +  MC_MAESTRO_EXPRESS + MC_EXPRESS + MC_STD_PAYPASS + MC_GOLD + MC_CLOCK + MC_WORLD_ELITE + MC_PLATINUM + MC_K_N + MC_ART) != 1
     
    */
    (CASE WHEN lower(PRODUCT_NAME) like '%мир%' THEN 1 ELSE 0 END) MIR,
    
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%electron%' THEN 1 ELSE 0 END) VISA_ELECTRON,
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%' and (lower(PRODUCT_NAME) like '%classic%' or lower(PRODUCT_NAME) like '%visa paywave%') THEN 1 ELSE 0 END) VISA_CLASSIC,
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%gold%' and lower(PRODUCT_NAME) not like '%купил-накопил%' THEN 1 ELSE 0 END) VISA_GOLD,
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%platinum%' THEN 1 ELSE 0 END) VISA_PLATINUM,
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%infinite%' THEN 1 ELSE 0 END) VISA_INFINITE,
    (CASE WHEN lower(PRODUCT_NAME) like '%visa%' and lower(PRODUCT_NAME) like '%купил-накопил%'  THEN 1 ELSE 0 END) VISA_K_N,
    
    (CASE WHEN lower(PRODUCT_NAME) like '%maestro%express%' or lower(PRODUCT_NAME) like '%cirrus maestro%' THEN 1 ELSE 0 END) MC_MAESTRO_EXPRESS,
    
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%express%' THEN 1 ELSE 0 END) MC_EXPRESS,
    
    /*
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) not like '%express%' 
        and (
            lower(PRODUCT_NAME) like '%paypass%' or 
            lower(PRODUCT_NAME) like '%stand%' or
            lower(PRODUCT_NAME) like '%корп. карта на представительские расходы%'
        ) THEN 1 ELSE 0 END)  MC_STD_PAYPASS,*/
    (CASE WHEN lower(PRODUCT_NAME) not like '%express%' and regexp_like(lower(PRODUCT_NAME), 'mastercard paypass prepaid rur|mastercard stand|mc paypass standart|mcard standart paypass|корп. карта на представительские расходы') THEN 1 ELSE 0 END)  MC_STD_PAYPASS,        
    
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%gold%' and lower(PRODUCT_NAME) not like '%купил-накопил%' 
        /*and not (
            lower(PRODUCT_NAME) like '%paypass%' or 
            lower(PRODUCT_NAME) like '%stand%' or
            lower(PRODUCT_NAME) like '%корп. карта на представительские расходы%'
        )*/ THEN 1 ELSE 0 END) MC_GOLD,
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and (lower(PRODUCT_NAME) like '%watch2pay%' or lower(PRODUCT_NAME) like '%часы%')
        /*and not (
            lower(PRODUCT_NAME) like '%paypass%' or 
            lower(PRODUCT_NAME) like '%stand%' or
            lower(PRODUCT_NAME) like '%корп. карта на представительские расходы%'
        )*/ THEN 1 ELSE 0 END) MC_CLOCK,
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%world elite%' THEN 1 ELSE 0 END) MC_WORLD_ELITE,
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%platinum%' and not lower(PRODUCT_NAME) like '%арт-карта%' THEN 1 ELSE 0 END) MC_PLATINUM,
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%купил-накопил%' THEN 1 ELSE 0 END) MC_K_N,
    (CASE WHEN (lower(PRODUCT_NAME) like '%mc%' or lower(PRODUCT_NAME) like '%mastercard%') and lower(PRODUCT_NAME) like '%арт-карта%' THEN 1 ELSE 0 END) MC_ART

       


FROM WH.IBS_CARDS