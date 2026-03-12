-- =============================================================================
-- MESkit Seed Data — Realistic electronics manufacturing scenario
-- Scenario: Consumer electronics factory producing smart displays and controllers
-- =============================================================================
-- Run with: supabase db push (as migration) or directly via psql/Supabase SQL Editor
-- Uses SECURITY DEFINER context — bypasses RLS

DO $$
DECLARE
  -- Context
  v_user_id     UUID := '2c7e6f2d-506a-4206-8ded-9d018f6b9480';
  v_org_id      UUID := '345af413-f979-484a-9ca7-8dc1eecf4165';
  v_plant_id    UUID := '847ddb65-b6b6-4130-b2b6-0170e2680e9b';

  -- Lines
  v_line_smt    UUID;
  v_line_assy   UUID;
  v_line_test   UUID;

  -- Workstations (SMT line)
  v_ws_loader   UUID;
  v_ws_printer  UUID;
  v_ws_picker   UUID;
  v_ws_reflow   UUID;
  v_ws_aoi      UUID;

  -- Workstations (Assembly line)
  v_ws_press    UUID;
  v_ws_solder   UUID;
  v_ws_conformal UUID;
  v_ws_mech     UUID;

  -- Workstations (Test line)
  v_ws_ict      UUID;
  v_ws_func     UUID;
  v_ws_burn     UUID;
  v_ws_final    UUID;
  v_ws_pack     UUID;

  -- Machines
  v_m_loader    UUID;
  v_m_printer   UUID;
  v_m_picker1   UUID;
  v_m_picker2   UUID;
  v_m_reflow    UUID;
  v_m_aoi       UUID;
  v_m_press     UUID;
  v_m_solder    UUID;
  v_m_conformal UUID;
  v_m_torque    UUID;
  v_m_ict       UUID;
  v_m_func      UUID;
  v_m_chamber   UUID;
  v_m_hipot     UUID;
  v_m_labeler   UUID;

  -- Part numbers
  v_pn_display  UUID;
  v_pn_ctrl     UUID;
  v_pn_psu      UUID;

  -- Items (BOM components)
  v_item_pcb_main   UUID;
  v_item_pcb_ctrl   UUID;
  v_item_pcb_psu    UUID;
  v_item_mcu        UUID;
  v_item_wifi       UUID;
  v_item_lcd        UUID;
  v_item_touch      UUID;
  v_item_cap_100u   UUID;
  v_item_cap_10u    UUID;
  v_item_res_10k    UUID;
  v_item_res_4k7    UUID;
  v_item_mosfet     UUID;
  v_item_transformer UUID;
  v_item_connector  UUID;
  v_item_enclosure  UUID;
  v_item_ribbon     UUID;
  v_item_heatsink   UUID;
  v_item_fan        UUID;
  v_item_screws     UUID;
  v_item_label      UUID;

  -- Routes
  v_route_display UUID;
  v_route_ctrl    UUID;
  v_route_psu     UUID;

  -- Route steps (for unit generation)
  v_rs_display_steps UUID[];
  v_rs_ctrl_steps    UUID[];
  v_rs_psu_steps     UUID[];

  -- Serial algorithms
  v_sa_display UUID;
  v_sa_ctrl    UUID;
  v_sa_psu     UUID;

  -- Production orders
  v_po_display UUID;
  v_po_ctrl    UUID;
  v_po_psu     UUID;

  -- Defect codes
  v_dc_solder  UUID;
  v_dc_misalign UUID;
  v_dc_missing UUID;
  v_dc_crack   UUID;
  v_dc_esd     UUID;
  v_dc_dim     UUID;
  v_dc_firmware UUID;
  v_dc_cosmetic UUID;

  -- Temp vars
  v_unit_id    UUID;
  v_serial     TEXT;
  v_step_id    UUID;
  v_ws_id      UUID;
  v_result     unit_result;
  v_ts         TIMESTAMPTZ;
  i            INT;
  j            INT;

BEGIN
  -- ============================================================
  -- 1. LINES
  -- ============================================================
  v_line_smt  := gen_random_uuid();
  v_line_assy := gen_random_uuid();
  v_line_test := gen_random_uuid();

  INSERT INTO lines (id, user_id, org_id, plant_id, name, description) VALUES
    (v_line_smt,  v_user_id, v_org_id, v_plant_id, 'SMT-1',      'Surface Mount Technology line — PCB population'),
    (v_line_assy, v_user_id, v_org_id, v_plant_id, 'ASSY-1',     'Mechanical assembly and integration'),
    (v_line_test, v_user_id, v_org_id, v_plant_id, 'TEST-1',     'Electrical test, burn-in, and final QC');

  -- ============================================================
  -- 2. WORKSTATIONS
  -- ============================================================
  v_ws_loader   := gen_random_uuid();
  v_ws_printer  := gen_random_uuid();
  v_ws_picker   := gen_random_uuid();
  v_ws_reflow   := gen_random_uuid();
  v_ws_aoi      := gen_random_uuid();

  v_ws_press    := gen_random_uuid();
  v_ws_solder   := gen_random_uuid();
  v_ws_conformal := gen_random_uuid();
  v_ws_mech     := gen_random_uuid();

  v_ws_ict      := gen_random_uuid();
  v_ws_func     := gen_random_uuid();
  v_ws_burn     := gen_random_uuid();
  v_ws_final    := gen_random_uuid();
  v_ws_pack     := gen_random_uuid();

  INSERT INTO workstations (id, user_id, org_id, line_id, name, position, operator_name) VALUES
    -- SMT Line
    (v_ws_loader,   v_user_id, v_org_id, v_line_smt,  'PCB Loader',        1, 'Ana Silva'),
    (v_ws_printer,  v_user_id, v_org_id, v_line_smt,  'Solder Paste Print', 2, 'Ana Silva'),
    (v_ws_picker,   v_user_id, v_org_id, v_line_smt,  'Pick & Place',      3, 'Marco Weber'),
    (v_ws_reflow,   v_user_id, v_org_id, v_line_smt,  'Reflow Oven',       4, NULL),
    (v_ws_aoi,      v_user_id, v_org_id, v_line_smt,  'AOI Inspection',    5, 'Yuki Tanaka'),
    -- Assembly Line
    (v_ws_press,    v_user_id, v_org_id, v_line_assy, 'Press-Fit',         1, 'Luca Rossi'),
    (v_ws_solder,   v_user_id, v_org_id, v_line_assy, 'Selective Solder',  2, NULL),
    (v_ws_conformal, v_user_id, v_org_id, v_line_assy, 'Conformal Coat',   3, NULL),
    (v_ws_mech,     v_user_id, v_org_id, v_line_assy, 'Mechanical Assembly', 4, 'David Okonkwo'),
    -- Test Line
    (v_ws_ict,      v_user_id, v_org_id, v_line_test, 'ICT',               1, 'Sara Müller'),
    (v_ws_func,     v_user_id, v_org_id, v_line_test, 'Functional Test',   2, 'Sara Müller'),
    (v_ws_burn,     v_user_id, v_org_id, v_line_test, 'Burn-In Chamber',   3, NULL),
    (v_ws_final,    v_user_id, v_org_id, v_line_test, 'Final QC',          4, 'Priya Patel'),
    (v_ws_pack,     v_user_id, v_org_id, v_line_test, 'Pack & Label',      5, 'Priya Patel');

  -- ============================================================
  -- 3. MACHINES
  -- ============================================================
  v_m_loader    := gen_random_uuid();
  v_m_printer   := gen_random_uuid();
  v_m_picker1   := gen_random_uuid();
  v_m_picker2   := gen_random_uuid();
  v_m_reflow    := gen_random_uuid();
  v_m_aoi       := gen_random_uuid();
  v_m_press     := gen_random_uuid();
  v_m_solder    := gen_random_uuid();
  v_m_conformal := gen_random_uuid();
  v_m_torque    := gen_random_uuid();
  v_m_ict       := gen_random_uuid();
  v_m_func      := gen_random_uuid();
  v_m_chamber   := gen_random_uuid();
  v_m_hipot     := gen_random_uuid();
  v_m_labeler   := gen_random_uuid();

  INSERT INTO machines (id, user_id, org_id, workstation_id, name, type, status) VALUES
    (v_m_loader,    v_user_id, v_org_id, v_ws_loader,    'Yamaha YSL-F',          'loader',          'EXECUTE'),
    (v_m_printer,   v_user_id, v_org_id, v_ws_printer,   'DEK Horizon 03iX',      'screen_printer',  'EXECUTE'),
    (v_m_picker1,   v_user_id, v_org_id, v_ws_picker,    'Fuji NXT III',          'pick_and_place',  'EXECUTE'),
    (v_m_picker2,   v_user_id, v_org_id, v_ws_picker,    'Fuji NXT III #2',       'pick_and_place',  'IDLE'),
    (v_m_reflow,    v_user_id, v_org_id, v_ws_reflow,    'Heller 1913 MK7',       'reflow_oven',     'EXECUTE'),
    (v_m_aoi,       v_user_id, v_org_id, v_ws_aoi,       'Koh Young Zenith 2',    'aoi',             'EXECUTE'),
    (v_m_press,     v_user_id, v_org_id, v_ws_press,     'Schmidt ServoPress 420', 'press',          'EXECUTE'),
    (v_m_solder,    v_user_id, v_org_id, v_ws_solder,    'Ersa Versaflow 4/55',   'selective_solder', 'EXECUTE'),
    (v_m_conformal, v_user_id, v_org_id, v_ws_conformal, 'Nordson Asymtek SL-940', 'coating',        'IDLE'),
    (v_m_torque,    v_user_id, v_org_id, v_ws_mech,      'Atlas Copco QST 25-10', 'torque_driver',   'EXECUTE'),
    (v_m_ict,       v_user_id, v_org_id, v_ws_ict,       'Keysight i3070 S6',     'ict_tester',      'EXECUTE'),
    (v_m_func,      v_user_id, v_org_id, v_ws_func,      'NI PXIe-1095',          'functional_test', 'EXECUTE'),
    (v_m_chamber,   v_user_id, v_org_id, v_ws_burn,      'Espec PU-3KP',          'thermal_chamber', 'EXECUTE'),
    (v_m_hipot,     v_user_id, v_org_id, v_ws_final,     'Chroma 19032',          'hipot_tester',    'IDLE'),
    (v_m_labeler,   v_user_id, v_org_id, v_ws_pack,      'Zebra ZT620',           'label_printer',   'EXECUTE');

  -- ============================================================
  -- 4. ITEMS (raw materials / components)
  -- ============================================================
  v_item_pcb_main    := gen_random_uuid();
  v_item_pcb_ctrl    := gen_random_uuid();
  v_item_pcb_psu     := gen_random_uuid();
  v_item_mcu         := gen_random_uuid();
  v_item_wifi        := gen_random_uuid();
  v_item_lcd         := gen_random_uuid();
  v_item_touch       := gen_random_uuid();
  v_item_cap_100u    := gen_random_uuid();
  v_item_cap_10u     := gen_random_uuid();
  v_item_res_10k     := gen_random_uuid();
  v_item_res_4k7     := gen_random_uuid();
  v_item_mosfet      := gen_random_uuid();
  v_item_transformer := gen_random_uuid();
  v_item_connector   := gen_random_uuid();
  v_item_enclosure   := gen_random_uuid();
  v_item_ribbon      := gen_random_uuid();
  v_item_heatsink    := gen_random_uuid();
  v_item_fan         := gen_random_uuid();
  v_item_screws      := gen_random_uuid();
  v_item_label       := gen_random_uuid();

  INSERT INTO items (id, user_id, org_id, name, description) VALUES
    (v_item_pcb_main,    v_user_id, v_org_id, 'PCB-MAIN-4L-FR4',      '4-layer FR4 main board, 160×100mm'),
    (v_item_pcb_ctrl,    v_user_id, v_org_id, 'PCB-CTRL-2L-FR4',      '2-layer FR4 controller board, 80×60mm'),
    (v_item_pcb_psu,     v_user_id, v_org_id, 'PCB-PSU-2L-CEM3',      '2-layer CEM3 power supply board, 100×65mm'),
    (v_item_mcu,         v_user_id, v_org_id, 'STM32H743VIT6',        'ARM Cortex-M7 MCU, 480 MHz, LQFP-100'),
    (v_item_wifi,        v_user_id, v_org_id, 'ESP32-S3-WROOM-1-N8R8','Wi-Fi + BLE module, 8 MB flash'),
    (v_item_lcd,         v_user_id, v_org_id, 'BOE-GV070WNM-N10',     '7-inch IPS LCD panel, 1024×600'),
    (v_item_touch,       v_user_id, v_org_id, 'GT911-TOUCH-7IN',      'Capacitive touch digitizer, 7-inch'),
    (v_item_cap_100u,    v_user_id, v_org_id, 'CAP-100uF-25V-1206',   'MLCC capacitor 100µF 25V, 1206'),
    (v_item_cap_10u,     v_user_id, v_org_id, 'CAP-10uF-16V-0805',    'MLCC capacitor 10µF 16V, 0805'),
    (v_item_res_10k,     v_user_id, v_org_id, 'RES-10K-1%-0402',      'Thin-film resistor 10kΩ 1%, 0402'),
    (v_item_res_4k7,     v_user_id, v_org_id, 'RES-4K7-1%-0402',      'Thin-film resistor 4.7kΩ 1%, 0402'),
    (v_item_mosfet,      v_user_id, v_org_id, 'IRF3205-TO220',        'N-channel MOSFET 55V 110A, TO-220'),
    (v_item_transformer, v_user_id, v_org_id, 'EFD25-XFMR-24V',      'EFD25 transformer, 24V output'),
    (v_item_connector,   v_user_id, v_org_id, 'MOLEX-5566-24P',       '24-pin Molex Mini-Fit Jr connector'),
    (v_item_enclosure,   v_user_id, v_org_id, 'ENC-ABS-250X180X45',   'ABS injection-molded enclosure, grey'),
    (v_item_ribbon,      v_user_id, v_org_id, 'FFC-40P-0.5MM-150MM',  '40-pin FFC ribbon cable, 150mm'),
    (v_item_heatsink,    v_user_id, v_org_id, 'HS-AL-40X40X10',       'Aluminum heatsink 40×40×10mm'),
    (v_item_fan,         v_user_id, v_org_id, 'FAN-5V-30X30X10',      'DC brushless fan 5V, 30×30mm'),
    (v_item_screws,      v_user_id, v_org_id, 'SCR-M3X8-PH-SS',      'M3×8mm Phillips head, stainless'),
    (v_item_label,       v_user_id, v_org_id, 'LBL-QR-POLY-50X30',   'Polyester QR code label 50×30mm');

  -- ============================================================
  -- 5. PART NUMBERS
  -- ============================================================
  v_pn_display := gen_random_uuid();
  v_pn_ctrl    := gen_random_uuid();
  v_pn_psu     := gen_random_uuid();

  INSERT INTO part_numbers (id, user_id, org_id, name, description) VALUES
    (v_pn_display, v_user_id, v_org_id, 'MK-7100-DISPLAY', 'MESkit Smart Display 7" — touchscreen HMI panel'),
    (v_pn_ctrl,    v_user_id, v_org_id, 'MK-3200-CTRL',    'MESkit Edge Controller — Wi-Fi gateway for shop floor'),
    (v_pn_psu,     v_user_id, v_org_id, 'MK-PS24-60W',     'MESkit Power Supply 24V 60W — industrial DIN rail');

  -- ============================================================
  -- 6. BILL OF MATERIALS
  -- ============================================================

  -- BOM: MK-7100-DISPLAY
  INSERT INTO bom_entries (part_number_id, item_id, quantity, position) VALUES
    (v_pn_display, v_item_pcb_main,  1,  1),
    (v_pn_display, v_item_mcu,       1,  2),
    (v_pn_display, v_item_wifi,      1,  3),
    (v_pn_display, v_item_lcd,       1,  4),
    (v_pn_display, v_item_touch,     1,  5),
    (v_pn_display, v_item_cap_100u,  8,  6),
    (v_pn_display, v_item_cap_10u,   24, 7),
    (v_pn_display, v_item_res_10k,   32, 8),
    (v_pn_display, v_item_res_4k7,   16, 9),
    (v_pn_display, v_item_connector, 2,  10),
    (v_pn_display, v_item_enclosure, 1,  11),
    (v_pn_display, v_item_ribbon,    1,  12),
    (v_pn_display, v_item_screws,    6,  13),
    (v_pn_display, v_item_label,     1,  14);

  -- BOM: MK-3200-CTRL
  INSERT INTO bom_entries (part_number_id, item_id, quantity, position) VALUES
    (v_pn_ctrl, v_item_pcb_ctrl,  1,  1),
    (v_pn_ctrl, v_item_mcu,       1,  2),
    (v_pn_ctrl, v_item_wifi,      1,  3),
    (v_pn_ctrl, v_item_cap_10u,   12, 4),
    (v_pn_ctrl, v_item_res_10k,   18, 5),
    (v_pn_ctrl, v_item_res_4k7,   8,  6),
    (v_pn_ctrl, v_item_connector, 3,  7),
    (v_pn_ctrl, v_item_heatsink,  1,  8),
    (v_pn_ctrl, v_item_enclosure, 1,  9),
    (v_pn_ctrl, v_item_screws,    4,  10),
    (v_pn_ctrl, v_item_label,     1,  11);

  -- BOM: MK-PS24-60W
  INSERT INTO bom_entries (part_number_id, item_id, quantity, position) VALUES
    (v_pn_psu, v_item_pcb_psu,      1,  1),
    (v_pn_psu, v_item_mosfet,       4,  2),
    (v_pn_psu, v_item_transformer,  1,  3),
    (v_pn_psu, v_item_cap_100u,     6,  4),
    (v_pn_psu, v_item_cap_10u,      10, 5),
    (v_pn_psu, v_item_res_10k,      12, 6),
    (v_pn_psu, v_item_connector,    2,  7),
    (v_pn_psu, v_item_heatsink,     2,  8),
    (v_pn_psu, v_item_fan,          1,  9),
    (v_pn_psu, v_item_screws,       4,  10),
    (v_pn_psu, v_item_label,        1,  11);

  -- ============================================================
  -- 7. DEFECT CODES
  -- ============================================================
  v_dc_solder   := gen_random_uuid();
  v_dc_misalign := gen_random_uuid();
  v_dc_missing  := gen_random_uuid();
  v_dc_crack    := gen_random_uuid();
  v_dc_esd      := gen_random_uuid();
  v_dc_dim      := gen_random_uuid();
  v_dc_firmware := gen_random_uuid();
  v_dc_cosmetic := gen_random_uuid();

  INSERT INTO defect_codes (id, user_id, org_id, code, description, severity) VALUES
    (v_dc_solder,   v_user_id, v_org_id, 'SOL-001', 'Solder bridge / short',           'major'),
    (v_dc_misalign, v_user_id, v_org_id, 'PLC-002', 'Component misalignment > 0.2mm',  'minor'),
    (v_dc_missing,  v_user_id, v_org_id, 'PLC-003', 'Missing component',               'critical'),
    (v_dc_crack,    v_user_id, v_org_id, 'MEC-004', 'PCB micro-crack detected',        'critical'),
    (v_dc_esd,      v_user_id, v_org_id, 'ESD-005', 'ESD damage — component failure',  'critical'),
    (v_dc_dim,      v_user_id, v_org_id, 'DIM-006', 'Dimensional out-of-spec',         'minor'),
    (v_dc_firmware, v_user_id, v_org_id, 'FW-007',  'Firmware flash failure / CRC mismatch', 'major'),
    (v_dc_cosmetic, v_user_id, v_org_id, 'COS-008', 'Cosmetic defect — scratch or mark', 'minor');

  -- ============================================================
  -- 8. ROUTES
  -- ============================================================

  -- Route: Display (full flow — SMT → Assembly → Test)
  v_route_display := gen_random_uuid();
  INSERT INTO routes (id, user_id, org_id, part_number_id, name, version) VALUES
    (v_route_display, v_user_id, v_org_id, v_pn_display, 'MK-7100 Standard Build', 1);

  v_rs_display_steps := ARRAY[]::UUID[];
  -- Step 1: PCB Load
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_loader, 1, 'PCB Loading', false, 15);
  -- Step 2: Solder Paste
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_printer, 2, 'Solder Paste Application', true, 25);
  -- Step 3: Pick & Place
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_picker, 3, 'Component Placement', true, 45);
  -- Step 4: Reflow
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_reflow, 4, 'Reflow Soldering', false, 180);
  -- Step 5: AOI
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_aoi, 5, 'Automated Optical Inspection', true, 30);
  -- Step 6: Press-Fit connectors
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_press, 6, 'Connector Press-Fit', true, 20);
  -- Step 7: Mechanical Assembly
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_mech, 7, 'Enclosure Assembly', true, 90);
  -- Step 8: Functional Test
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_func, 8, 'Functional Test + FW Flash', true, 60);
  -- Step 9: Final QC
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_final, 9, 'Final Quality Check', true, 45);
  -- Step 10: Pack
  v_step_id := gen_random_uuid();
  v_rs_display_steps := v_rs_display_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_display, v_ws_pack, 10, 'Labeling & Packaging', false, 30);

  -- Route: Controller (shorter — SMT → Test)
  v_route_ctrl := gen_random_uuid();
  INSERT INTO routes (id, user_id, org_id, part_number_id, name, version) VALUES
    (v_route_ctrl, v_user_id, v_org_id, v_pn_ctrl, 'MK-3200 Standard Build', 1);

  v_rs_ctrl_steps := ARRAY[]::UUID[];
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_loader, 1, 'PCB Loading', false, 12);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_printer, 2, 'Solder Paste Application', true, 20);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_picker, 3, 'Component Placement', true, 30);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_reflow, 4, 'Reflow Soldering', false, 180);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_aoi, 5, 'Automated Optical Inspection', true, 25);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_ict, 6, 'In-Circuit Test', true, 35);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_func, 7, 'Functional Test + FW Flash', true, 50);
  v_step_id := gen_random_uuid(); v_rs_ctrl_steps := v_rs_ctrl_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_ctrl, v_ws_pack, 8, 'Labeling & Packaging', false, 25);

  -- Route: Power Supply (SMT → Assembly → Test)
  v_route_psu := gen_random_uuid();
  INSERT INTO routes (id, user_id, org_id, part_number_id, name, version) VALUES
    (v_route_psu, v_user_id, v_org_id, v_pn_psu, 'MK-PS24 Standard Build', 1);

  v_rs_psu_steps := ARRAY[]::UUID[];
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_loader, 1, 'PCB Loading', false, 10);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_printer, 2, 'Solder Paste Application', true, 18);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_picker, 3, 'Component Placement', true, 25);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_reflow, 4, 'Reflow Soldering', false, 180);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_aoi, 5, 'Automated Optical Inspection', true, 22);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_solder, 6, 'Selective Solder (THT)', true, 40);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_conformal, 7, 'Conformal Coating', false, 35);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_ict, 8, 'In-Circuit Test', true, 30);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_burn, 9, 'Burn-In 2h @ 50°C', true, 7200);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_final, 10, 'Hi-Pot + Final QC', true, 40);
  v_step_id := gen_random_uuid(); v_rs_psu_steps := v_rs_psu_steps || v_step_id;
  INSERT INTO route_steps (id, route_id, workstation_id, step_number, name, pass_fail_gate, ideal_cycle_time_seconds) VALUES
    (v_step_id, v_route_psu, v_ws_pack, 11, 'Labeling & Packaging', false, 20);

  -- ============================================================
  -- 9. SERIAL ALGORITHMS
  -- ============================================================
  v_sa_display := gen_random_uuid();
  v_sa_ctrl    := gen_random_uuid();
  v_sa_psu     := gen_random_uuid();

  INSERT INTO serial_algorithms (id, part_number_id, prefix, current_counter, pad_length) VALUES
    (v_sa_display, v_pn_display, 'DSP', 0, 6),
    (v_sa_ctrl,    v_pn_ctrl,    'CTL', 0, 6),
    (v_sa_psu,     v_pn_psu,     'PSU', 0, 6);

  -- ============================================================
  -- 10. PRODUCTION ORDERS
  -- ============================================================
  v_po_display := gen_random_uuid();
  v_po_ctrl    := gen_random_uuid();
  v_po_psu     := gen_random_uuid();

  INSERT INTO production_orders (id, user_id, org_id, order_number, part_number_id, route_id, quantity_ordered, quantity_completed, status) VALUES
    (v_po_display, v_user_id, v_org_id, 'WO-2026-0312-DSP', v_pn_display, v_route_display, 50, 0, 'running'),
    (v_po_ctrl,    v_user_id, v_org_id, 'WO-2026-0312-CTL', v_pn_ctrl,    v_route_ctrl,    80, 0, 'running'),
    (v_po_psu,     v_user_id, v_org_id, 'WO-2026-0312-PSU', v_pn_psu,     v_route_psu,     100, 0, 'scheduled');

  -- ============================================================
  -- 11. QUALITY TEST DEFINITIONS
  -- ============================================================
  INSERT INTO quality_test_definitions (user_id, org_id, part_number_id, route_step_id, test_name, property, unit_of_measure, lower_limit, upper_limit, measurement_method) VALUES
    -- Display — AOI step
    (v_user_id, v_org_id, v_pn_display, v_rs_display_steps[5], 'Solder Joint Inspection', 'solder_coverage_pct', '%', 85, 100, 'AOI machine vision'),
    -- Display — Functional Test step
    (v_user_id, v_org_id, v_pn_display, v_rs_display_steps[8], 'LCD Brightness', 'brightness', 'nits', 280, 350, 'Luminance meter at 200mm'),
    (v_user_id, v_org_id, v_pn_display, v_rs_display_steps[8], 'Touch Response', 'response_time', 'ms', 0, 12, 'Automated touch probe'),
    (v_user_id, v_org_id, v_pn_display, v_rs_display_steps[8], 'Current Draw Idle', 'current_idle', 'mA', 80, 150, 'Bench PSU ammeter'),
    -- Controller — ICT step
    (v_user_id, v_org_id, v_pn_ctrl, v_rs_ctrl_steps[6], 'Bus Voltage Rail', 'vcc_3v3', 'V', 3.2, 3.4, 'ICT probe point TP12'),
    (v_user_id, v_org_id, v_pn_ctrl, v_rs_ctrl_steps[6], 'Clock Frequency', 'mcu_clk', 'MHz', 478, 482, 'Frequency counter on TP3'),
    -- PSU — Burn-In step
    (v_user_id, v_org_id, v_pn_psu, v_rs_psu_steps[9], 'Output Voltage Stability', 'vout_24v', 'V', 23.8, 24.2, 'DMM after 2h soak at 50°C'),
    (v_user_id, v_org_id, v_pn_psu, v_rs_psu_steps[9], 'Ripple Voltage', 'ripple_pp', 'mV', 0, 100, 'Oscilloscope 20 MHz BW limit'),
    -- PSU — Hi-Pot step
    (v_user_id, v_org_id, v_pn_psu, v_rs_psu_steps[10], 'Dielectric Withstand', 'hipot_leakage', 'mA', 0, 5, 'Chroma 19032 at 1500VAC/1min');

  -- ============================================================
  -- 12. UNITS + HISTORY (generate realistic production data)
  -- ============================================================

  -- Generate 25 completed Display units
  FOR i IN 1..25 LOOP
    v_unit_id := gen_random_uuid();
    v_serial := 'DSP' || lpad(i::text, 6, '0');
    v_ts := now() - interval '3 days' + (i * interval '45 minutes');

    INSERT INTO units (id, user_id, org_id, serial_number, part_number_id, route_id, production_order_id, status, current_step, created_at) VALUES
      (v_unit_id, v_user_id, v_org_id, v_serial, v_pn_display, v_route_display, v_po_display, 'completed', 10, v_ts);

    -- Walk through all 10 steps
    FOR j IN 1..10 LOOP
      -- ~4% failure rate on AOI (step 5) and functional test (step 8)
      IF (j = 5 AND i IN (7, 19)) OR (j = 8 AND i = 14) THEN
        v_result := 'fail';
      ELSE
        v_result := 'pass';
      END IF;

      INSERT INTO unit_history (unit_id, route_step_id, workstation_id, result, timestamp, defect_code_id) VALUES
        (v_unit_id,
         v_rs_display_steps[j],
         (SELECT workstation_id FROM route_steps WHERE id = v_rs_display_steps[j]),
         v_result,
         v_ts + (j * interval '8 minutes'),
         CASE WHEN v_result = 'fail' AND j = 5 THEN v_dc_solder
              WHEN v_result = 'fail' AND j = 8 THEN v_dc_firmware
              ELSE NULL END);

      -- Add quality events for failures
      IF v_result = 'fail' THEN
        INSERT INTO quality_events (unit_id, workstation_id, event_type, result, defect_code_id, notes, timestamp) VALUES
          (v_unit_id,
           (SELECT workstation_id FROM route_steps WHERE id = v_rs_display_steps[j]),
           'inspection', 'fail',
           CASE WHEN j = 5 THEN v_dc_solder ELSE v_dc_firmware END,
           CASE WHEN j = 5 THEN 'Solder bridge on U3 pins 45-46, sent to rework'
                ELSE 'FW flash CRC mismatch, retry succeeded on 2nd attempt' END,
           v_ts + (j * interval '8 minutes'));

        -- Add rework event
        INSERT INTO quality_events (unit_id, workstation_id, event_type, result, defect_code_id, notes, timestamp) VALUES
          (v_unit_id,
           (SELECT workstation_id FROM route_steps WHERE id = v_rs_display_steps[j]),
           'rework', 'pass',
           CASE WHEN j = 5 THEN v_dc_solder ELSE v_dc_firmware END,
           'Reworked successfully, re-inspected and passed',
           v_ts + (j * interval '8 minutes') + interval '15 minutes');
      END IF;
    END LOOP;
  END LOOP;

  -- Update display order completion count
  UPDATE production_orders SET quantity_completed = 25 WHERE id = v_po_display;
  UPDATE serial_algorithms SET current_counter = 25 WHERE id = v_sa_display;

  -- Generate 40 completed Controller units
  FOR i IN 1..40 LOOP
    v_unit_id := gen_random_uuid();
    v_serial := 'CTL' || lpad(i::text, 6, '0');
    v_ts := now() - interval '2 days' + (i * interval '25 minutes');

    INSERT INTO units (id, user_id, org_id, serial_number, part_number_id, route_id, production_order_id, status, current_step, created_at) VALUES
      (v_unit_id, v_user_id, v_org_id, v_serial, v_pn_ctrl, v_route_ctrl, v_po_ctrl, 'completed', 8, v_ts);

    FOR j IN 1..8 LOOP
      IF (j = 5 AND i IN (8, 22, 35)) OR (j = 7 AND i = 16) THEN
        v_result := 'fail';
      ELSE
        v_result := 'pass';
      END IF;

      INSERT INTO unit_history (unit_id, route_step_id, workstation_id, result, timestamp, defect_code_id) VALUES
        (v_unit_id,
         v_rs_ctrl_steps[j],
         (SELECT workstation_id FROM route_steps WHERE id = v_rs_ctrl_steps[j]),
         v_result,
         v_ts + (j * interval '5 minutes'),
         CASE WHEN v_result = 'fail' AND j = 5 THEN v_dc_misalign
              WHEN v_result = 'fail' AND j = 7 THEN v_dc_esd
              ELSE NULL END);

      IF v_result = 'fail' THEN
        INSERT INTO quality_events (unit_id, workstation_id, event_type, result, defect_code_id, notes, timestamp) VALUES
          (v_unit_id,
           (SELECT workstation_id FROM route_steps WHERE id = v_rs_ctrl_steps[j]),
           'inspection', 'fail',
           CASE WHEN j = 5 THEN v_dc_misalign ELSE v_dc_esd END,
           CASE WHEN j = 5 THEN 'R22 shifted 0.3mm off pad, rework station corrected'
                ELSE 'U1 MCU ESD damage detected during functional test — unit scrapped' END,
           v_ts + (j * interval '5 minutes'));

        IF j = 5 THEN
          INSERT INTO quality_events (unit_id, workstation_id, event_type, result, defect_code_id, notes, timestamp) VALUES
            (v_unit_id,
             (SELECT workstation_id FROM route_steps WHERE id = v_rs_ctrl_steps[j]),
             'rework', 'pass', v_dc_misalign, 'Component re-placed and re-soldered',
             v_ts + (j * interval '5 minutes') + interval '10 minutes');
        ELSE
          -- ESD unit gets scrapped
          UPDATE units SET status = 'scrapped' WHERE id = v_unit_id;
          INSERT INTO quality_events (unit_id, workstation_id, event_type, result, defect_code_id, notes, timestamp) VALUES
            (v_unit_id,
             (SELECT workstation_id FROM route_steps WHERE id = v_rs_ctrl_steps[j]),
             'scrap', 'fail', v_dc_esd, 'Irreparable ESD damage, unit scrapped',
             v_ts + (j * interval '5 minutes') + interval '5 minutes');
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE production_orders SET quantity_completed = 39 WHERE id = v_po_ctrl;  -- 1 scrapped
  UPDATE serial_algorithms SET current_counter = 40 WHERE id = v_sa_ctrl;

  -- Generate 5 in-progress Display units (at various steps)
  FOR i IN 26..30 LOOP
    v_unit_id := gen_random_uuid();
    v_serial := 'DSP' || lpad(i::text, 6, '0');
    v_ts := now() - interval '2 hours' + ((i - 26) * interval '20 minutes');

    INSERT INTO units (id, user_id, org_id, serial_number, part_number_id, route_id, production_order_id, status, current_step, created_at) VALUES
      (v_unit_id, v_user_id, v_org_id, v_serial, v_pn_display, v_route_display, v_po_display, 'in_progress', i - 25, v_ts);

    -- Add history for completed steps only
    FOR j IN 1..(i - 25) LOOP
      INSERT INTO unit_history (unit_id, route_step_id, workstation_id, result, timestamp) VALUES
        (v_unit_id,
         v_rs_display_steps[j],
         (SELECT workstation_id FROM route_steps WHERE id = v_rs_display_steps[j]),
         'pass',
         v_ts + (j * interval '8 minutes'));
    END LOOP;
  END LOOP;

  UPDATE serial_algorithms SET current_counter = 30 WHERE id = v_sa_display;

  RAISE NOTICE 'Seed complete: 3 lines, 14 workstations, 15 machines, 3 PNs, 20 items, 3 routes, 3 orders, 70 units, 8 defect codes';
END $$;
