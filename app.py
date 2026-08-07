import os
import io
import mysql.connector
import base64
import cv2
import numpy as np
import qrcode
import mysql.connector
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, abort
from pyzbar.pyzbar import decode
from werkzeug.utils import secure_filename
from flask_mysqldb import MySQL

app = Flask(__name__)
app.secret_key = 'super_secure_factory_production_key_token'

# Database Server Configurations
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'factory_db2'
}

# --- Local Storage Directory forced inside the Flask public static tree ---
UPLOAD_FOLDER = os.path.join('static', 'uploads')
SUB_FOLDERS = ['photos', 'points', 'videos']
for folder in SUB_FOLDERS:
    os.makedirs(os.path.join(UPLOAD_FOLDER, folder), exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_db_connection():
    conn = mysql.connector.connect(**db_config)
    # Automatically configure session to allow large binary packet transfers
    cursor = conn.cursor()
    try:
        cursor.execute("SET GLOBAL max_allowed_packet = 67108864;")
    except Exception:
        pass  # Fallback if the database user lacks global privilege tokens
    cursor.close()
    return conn

# Factory Plant Metadata Map Values Mapping Table
PLANT_DATA = {
    "CH01": {"name": "SMS (Steel Melting Shop)", "code": "CHCHD"},
    "CH02": {"name": "Rolling Mill 16", "code": "CHGEN"},
    "CH03": {"name": "Rolling Mill 10 & 20", "code": "CHGEN"},
    "CH04": {"name": "Rebars", "code": "CHGEN"},
    "CH05": {"name": "Brightbar", "code": "CHBBD"},
    "CH06": {"name": "Anglebar", "code": "CHNPD"},
    "CH07": {"name": "Flatbar", "code": "CHGEN"},
    "CH08": {"name": "Wires", "code": "CHWRD"},
    "CH09": {"name": "WRM", "code": "CHWRM"},
    "CH10": {"name": "Seamless Tubes & Pipes", "code": "CHSTP"},
    "CH11": {"name": "Forging", "code": "CHFOR"},
    "CH12": {"name": "Back Office Mumbai", "code": "CHGEN"}
}

# --- EMPLOYEE ACCESS CHANNELS ---
@app.route('/')
def index():
    if 'user_id' in session: 
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user_id = request.form['user_id'].strip().upper()
        password = request.form['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # 🟢 UPDATED: Selecting the status field during the user query search loop
        cursor.execute("SELECT * FROM users WHERE user_id = %s AND password = %s", (user_id, password))
        user = cursor.fetchone()
        cursor.close(); conn.close()
        
        if user:
            # 🛑 CRITICAL GATEWAY SECURITY GUARD: Rejects blocked employee access profiles completely
            if user.get('status') == 'BLOCKED':
                return redirect(url_for('login', auth_error='account_blocked'))
                
            session['user_id'] = user['user_id']
            session['user_name'] = user['user_name']
            session['plant_name'] = user['plant_name']
            return redirect(url_for('dashboard'))
        
        return redirect(url_for('login', auth_error='invalid_credentials'))
    return render_template('login.html')


from datetime import date

@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    user_id = session['user_id']
    plant_name = session['plant_name']
    
    selected_date = request.args.get('filter_date') or request.form.get('filter_date')
    if not selected_date:
        selected_date = date.today().strftime('%Y-%m-%d')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT plant_id FROM users WHERE user_id = %s", (user_id,))
        user_row = cursor.fetchone()
        
        total_required = 0
        total_completed_today = 0
        completion_percentage = 0
        required_checkpoints_rows = []
        cleared_names_list = []
        
        if user_row:
            target_plant_id = user_row['plant_id']
            cursor.execute("SELECT point_name FROM checkpoints WHERE plant_id = %s ORDER BY point_name ASC", (target_plant_id,))
            required_checkpoints_rows = cursor.fetchall()
            total_required = len(required_checkpoints_rows)
            
            # Form reference array of all valid checkpoint strings for cross-matching
            valid_checkpoints = [str(r['point_name']).strip() for r in required_checkpoints_rows]
            
            query_scans_history = """
                SELECT DISTINCT Qr_code_scaning_detail 
                FROM user_report 
                WHERE user_id = %s AND DATE(Qr_code_scaning_time_at) = %s
            """
            cursor.execute(query_scans_history, (user_id, selected_date))
            scanned_records = cursor.fetchall()
            
            valid_scans_count = 0
            for record in scanned_records:
                detail_text = str(record['Qr_code_scaning_detail']).strip()
                
                # Case A: If it is the old long legacy string format, parse out the checkpoint name
                if f"PLANT_ID:{target_plant_id}" in detail_text and "CHECKPOINT:" in detail_text:
                    try:
                        point_token = detail_text.split("CHECKPOINT:")[1].split("|")[0].strip()
                        if point_token in valid_checkpoints and point_token not in cleared_names_list:
                            valid_scans_count += 1
                            cleared_names_list.append(point_token)
                    except Exception:
                        pass
                # Case B: If it is the new clean string format saved directly
                elif detail_text in valid_checkpoints:
                    if detail_text not in cleared_names_list:
                        valid_scans_count += 1
                        cleared_names_list.append(detail_text)
                        
            total_completed_today = valid_scans_count
            if total_required > 0:
                completion_percentage = int((total_completed_today / total_required) * 100)
        is_present = (total_required > 0 and total_completed_today == total_required)
        cursor.close()
        conn.close()
        
        return render_template('user_dashboard.html', 
                               user_name=session['user_name'], 
                               plant_name=plant_name,
                               total_required=total_required,
                               total_completed=total_completed_today,
                               progress_percent=completion_percentage,
                               is_present=is_present,
                               active_date=selected_date,
                               required_list=required_checkpoints_rows,
                               cleared_list=cleared_names_list)
                               
    except Exception as e:
        if cursor: cursor.close()
        if conn: conn.close()
        print(f"Dashboard Matrix Engine Crash Exception: {str(e)}")
        return render_template('user_dashboard.html', 
                               user_name=session['user_name'], 
                               plant_name=plant_name, 
                               total_required=0, 
                               total_completed=0, 
                               progress_percent=0, 
                               is_present=False,
                               active_date=selected_date,
                               required_list=[])

@app.route('/submit_report', methods=['POST'])
def submit_report():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401
    data = request.json
    conn = None; cursor = None
    try:
        raw_qr_detail = data.get('qr_detail', '')
        clean_checkpoint_name = str(raw_qr_detail).strip()
        
        # Extract only the checkpoint name if the scanned code uses the long pattern
        if "CHECKPOINT:" in clean_checkpoint_name:
            try:
                clean_checkpoint_name = clean_checkpoint_name.split("CHECKPOINT:")[1].split("|")[0].strip()
            except Exception:
                pass # Fallback to original string if splitting fails unexpectedly
                
        conn = get_db_connection(); cursor = conn.cursor()
        query = """
            INSERT INTO user_report 
            (user_id, user_name, plant_name, Qr_code_scaning_detail, Live_photo, Live_current_point_photo, Live_area_short_video, Remark_of_Point)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            session['user_id'], session['user_name'], session['plant_name'],
            clean_checkpoint_name, data.get('live_photo'), data.get('point_photo'), data.get('area_video'), data.get('remark')
        )
        cursor.execute(query, values)
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Report saved successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --- ADMINISTRATIVE HUB CONTROLS SYSTEM ---
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username'].strip()
        password = request.form['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM admins WHERE username = %s AND password = %s", (username, password))
        admin = cursor.fetchone()
        cursor.close(); conn.close()
        
        if admin:
            session['admin_logged_in'] = True
            session['admin_user'] = admin['username']
            session['admin_plant'] = admin['plant_id']
            return redirect(url_for('admin_dashboard'))
            
        return redirect(url_for('admin_login', auth_error='invalid_credentials'))
    return render_template('admin_login.html')
@app.route('/admin/dashboard', methods=['GET', 'POST'])
def admin_dashboard():
    if not session.get('admin_logged_in'): 
        return redirect(url_for('admin_login'))
        
    current_scope = session['admin_plant']
    allowed_plants = PLANT_DATA if current_scope == 'ALL' else {current_scope: PLANT_DATA[current_scope]}

    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'register_worker':
            user_name = request.form['user_name'].strip()
            password = request.form['password']
            plant_id = request.form['plant_id']
            card_number = request.form['card_number'].strip()
            security_answer = request.form['security_question_answer'].strip()
            
            if plant_id not in allowed_plants:
                flash("Security scope boundary bypass blocked.", "error")
                return redirect(url_for('admin_dashboard'))
                
            generated_user_id = f"{PLANT_DATA[plant_id]['code']}{card_number}"
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            try:
                cursor.execute("SELECT user_id FROM users WHERE user_id = %s OR card_number = %s", (generated_user_id, card_number))
                if cursor.fetchone():
                    flash("Worker ID or Card Number taken.", "exists")
                else:
                    # 🟢 INJECTED STATUS DEFAULT FIELD VALUE ('ACTIVE') FOR NEW SIGNUPS
                    cursor.execute("INSERT INTO users VALUES (%s, %s, %s, %s, %s, %s, %s, 'ACTIVE')", 
               (generated_user_id, card_number, user_name, password, plant_id, PLANT_DATA[plant_id]['name'], security_answer))
                    conn.commit()
                    flash(f"Registered Success: {generated_user_id}", "success")
            except Exception as e:
                flash(str(e), "error")
            finally:
                cursor.close(); conn.close()
            return redirect(url_for('admin_dashboard'))

        elif action == 'create_admin' and current_scope == 'ALL':
            new_user = request.form['new_username'].strip()
            new_pass = request.form['new_password']
            target_plant = request.form['target_plant_id']
            
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                cursor.execute("SELECT username FROM admins WHERE username = %s", (new_user,))
                if cursor.fetchone():
                    flash("Username taken.", "error")
                else:
                    # Injected a status column fallback default 'ACTIVE' to match your administrators table upgrades
                    cursor.execute("INSERT INTO admins (username, password, plant_id, status) VALUES (%s, %s, %s, 'ACTIVE')", (new_user, new_pass, target_plant))
                    conn.commit()
                    flash(f"Provisioned Admin: {new_user}", "success")
            except Exception as e:
                flash(str(e), "error")
            finally:
                cursor.close(); conn.close()
            return redirect(url_for('admin_dashboard'))

        elif action == 'update_worker':
            u_id = request.form.get('user_id')
            new_name = request.form['user_name'].strip()
            new_pass = request.form['password']
            
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("UPDATE users SET user_name = %s, password = %s WHERE user_id = %s", (new_name, new_pass, u_id))
                conn.commit()
                flash("Employee records modified successfully.", "success")
            except Exception as e:
                flash(str(e), "error")
            finally:
                cursor.close(); conn.close()
            return redirect(url_for('admin_dashboard'))

        # 🟢 NEW INJECTION: Process inline credential changes submitted from your new admin edit overlay modals
        elif action == 'update_admin_credentials':
            target_admin_id = request.form.get('admin_username')
            new_admin_pass = request.form.get('admin_password')
            
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute("UPDATE admins SET password = %s WHERE username = %s", (new_admin_pass, target_admin_id))
                conn.commit()
                flash("Plant administrator access keys modified successfully.", "success")
            except Exception as e:
                flash(str(e), "error")
            finally:
                cursor.close(); conn.close()
            return redirect(url_for('admin_dashboard'))

    # --- FETCH FRESH DATA FOR LEDGER TABS ---
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    user_reports_list, checkpoints_list, registered_workers_list, registered_admins_list = [], [], [], []
    try:
        cursor.execute("""
            SELECT report_id, user_id, user_name, plant_name, Qr_code_scaning_detail, 
                   Live_photo, Live_current_point_photo, Live_area_short_video, 
                   Remark_of_Point, Qr_code_scaning_time_at 
            FROM user_report ORDER BY Qr_code_scaning_time_at DESC
        """)
        user_reports_list = cursor.fetchall()
        
        cursor.execute("SELECT id, plant_id, point_name, qr_code_image FROM checkpoints ORDER BY plant_id ASC, point_name ASC")
        for cp in cursor.fetchall():
            if cp['qr_code_image']:
                cp['qr_code_image'] = f"data:image/png;base64,{base64.b64encode(cp['qr_code_image']).decode('utf-8')}"
            checkpoints_list.append(cp)

        # 🟢 UPDATED: Pulls 'u.status' field parameters to determine active/blocked layout indicators
        roster_query = """
            SELECT u.user_id, u.card_number, u.user_name, u.plant_id, u.plant_name, u.password, u.status,
                   (SELECT COUNT(*) FROM checkpoints cp WHERE cp.plant_id = u.plant_id) AS allocated_checkpoints
            FROM users u
        """
        if current_scope == 'ALL':
            cursor.execute(roster_query + " ORDER BY u.plant_id ASC, u.user_name ASC")
        else:
            cursor.execute(roster_query + " WHERE u.plant_id = %s ORDER BY u.user_name ASC", (current_scope,))
        registered_workers_list = cursor.fetchall()

        # 🟢 NEW INJECTION: Pull all database administrators into an array list to render your admin details view tab row panels
        cursor.execute("SELECT username, plant_id, password, status FROM admins ORDER BY plant_id ASC, username ASC")
        registered_admins_list = cursor.fetchall()

    except Exception as e:
        flash(f"Data Log Warning: {str(e)}", "error")
    finally:
        cursor.close(); conn.close()
        
    # Correct template name reassigned to clean up compilation building path parameters
    return render_template('admin_dashboard.html ', 
                           plants=allowed_plants, 
                           all_plants_list=PLANT_DATA, 
                           user_reports=user_reports_list, 
                           checkpoints=checkpoints_list,
                           registered_workers=registered_workers_list,
                           registered_admins=registered_admins_list) # <-- Injected admins payload context
@app.route('/get_checkpoints/<string:plant_id>')
def get_checkpoints(plant_id):
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    query = """
        SELECT point_name, CASE WHEN qr_code_image IS NOT NULL AND LENGTH(qr_code_image) > 0 THEN 1 ELSE 0 END as is_created 
        FROM checkpoints WHERE plant_id = %s ORDER BY point_name ASC
    """
    cursor.execute(query, (plant_id,))
    checkpoints = cursor.fetchall()
    cursor.close(); conn.close()
    return jsonify(checkpoints)

@app.route('/scan_frame', methods=['POST'])
def scan_frame():
    data = request.json
    image_data = data.get('image')
    if not image_data:
        return jsonify({'qr_text': None})
    try:
        if ',' in image_data:
            encoded_data = image_data.split(',')[1]
        else:
            encoded_data = image_data
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        qr_codes = decode(frame)
        if qr_codes:
            qr_text = qr_codes[0].data.decode('utf-8')
            return jsonify({'qr_text': qr_text})
    except Exception as e:
        print("Server decoding exception:", e)
    return jsonify({'qr_text': None})

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    # Retrieve the combined raw value from the dropdown selection
    raw_plant_id = request.form.get('plant_id', '').strip()
    pt_name = request.form.get('point_name')
    
    if not raw_plant_id or not pt_name:
        flash("Required data components are missing.", "error")
        return redirect(url_for('admin_dashboard'))
    
    # Split the "Plant_id - Plant_name" format to isolate both values
    if " - " in raw_plant_id:
        p_id, p_name = raw_plant_id.split(" - ", 1)
        p_id = p_id.strip()
        p_name = p_name.strip()
    else:
        p_id = raw_plant_id
        # Fallback to dictionary lookup if the dropdown selection did not include the name
        p_name = PLANT_DATA.get(p_id, {}).get('name', 'Unknown Machine Space')

    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM plants WHERE id = %s", (p_id,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO plants (id, name) VALUES (%s, %s)", (p_id, p_name))
            conn.commit()
        
        # Updated query to verify and store plant_name directly inside the checkpoints table if needed
        cursor.execute("SELECT id, qr_code_image FROM checkpoints WHERE plant_id = %s AND point_name = %s", (p_id, pt_name))
        row = cursor.fetchone()
        if row and row['qr_code_image'] is not None:
            flash(f"Error: A QR card for checkpoint '{pt_name}' already exists.", "error")
            return redirect(url_for('admin_dashboard'))
            
        qr_payload = f"PLANT_ID:{p_id}|PLANT_NAME:{p_name}|CHECKPOINT:{pt_name}"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_payload); qr.make(fit=True)
        buf = io.BytesIO()
        qr.make_image(fill_color="black", back_color="white").save(buf, format='PNG')
        raw_qr_bytes = buf.getvalue()
        
        if row:
            cursor.execute("UPDATE checkpoints SET qr_code_image = %s, plant_name = %s WHERE plant_id = %s AND point_name = %s", (raw_qr_bytes, p_name, p_id, pt_name))
        else:
            cursor.execute("INSERT INTO checkpoints (plant_id, plant_name, point_name, qr_code_image) VALUES (%s, %s, %s, %s)", (p_id, p_name, pt_name, raw_qr_bytes))
        conn.commit()
        flash(f"QR Code successfully built!", "success")
    except Exception as e: flash(f"Database sync exception: {str(e)}", "error")
    finally: cursor.close(); conn.close()
    return redirect(url_for('admin_dashboard'))


@app.route('/delete_checkpoint/<int:checkpoint_id>', methods=['POST'])
def delete_checkpoint(checkpoint_id):
    if not session.get('admin_logged_in'): return jsonify({'success': False, 'message': 'Unauthorized Context'}), 401
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT point_name, plant_id FROM checkpoints WHERE id = %s", (checkpoint_id,))
        if not cursor.fetchone(): return jsonify({'success': False, 'message': 'Asset not found'}), 404
        cursor.execute("DELETE FROM checkpoints WHERE id = %s", (checkpoint_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Checkpoint deleted completely.'}), 200
    except Exception as e: return jsonify({'success': False, 'message': str(e)}), 500
    finally: cursor.close(); conn.close()

@app.route('/admin/logout')
def admin_logout():
    session.clear(); return redirect(url_for('admin_login'))

from flask import send_from_directory

@app.route('/serve_report_media/<path:filename>')
def serve_report_media(filename):
    base_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
    clean_filename = filename.replace('static/uploads/', '').replace('uploads/', '')
    if clean_filename.startswith('/'):
        clean_filename = clean_filename.lstrip('/')
    try:
        return send_from_directory(base_dir, clean_filename)
    except FileNotFoundError:
        return abort(404, description="Media asset file not found on disk.")


# =====================================================================
# 📊 FIXED: HISTORIC TIMELINE MANAGER ROUTE
# =====================================================================
@app.route('/admin/view_report/<int:report_id>')
def view_report_detail(report_id):
    if not session.get('admin_logged_in'): 
        return redirect(url_for('admin_login'))
        
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Fetch primary row transaction reference
    cursor.execute("SELECT * FROM user_report WHERE report_id = %s", (report_id,))
    base_report = cursor.fetchone()
    
    if not base_report:
        cursor.close(); conn.close()
        return "Operational Error: Safety log asset reference not found.", 404

    # 🟢 1. FETCH TOTAL CONFIGURABLE CHECKPOINTS FOR THIS WORKER'S PLANT
    cursor.execute("""
        SELECT COUNT(*) as plant_limit 
        FROM checkpoints 
        WHERE plant_id = (SELECT plant_id FROM users WHERE user_id = %s)
    """, (base_report['user_id'],))
    plant_limit_row = cursor.fetchone()
    allocated_count = plant_limit_row['plant_limit'] if plant_limit_row else 0
        
    query = """
        SELECT * FROM user_report 
        WHERE user_id = %s
        ORDER BY Qr_code_scaning_time_at DESC
    """
    cursor.execute(query, (base_report['user_id'],))
    all_scans = cursor.fetchall()
    
    # BASE64 VS STORAGE DISK FILENAME DETECTOR & CASE SYNC MATRIX
    for scan in all_scans:
        # 📑 DYNAMIC IDENTIFIER SYNCHRONIZATION
        r_id = scan.get('report_id') or scan.get('report_id')
        scan['report_id'] = r_id

        for key in ['Live_photo', 'Live_current_point_photo', 'Live_area_short_video']:
            if scan.get(key):
                raw_val = str(scan[key]).strip()
                
                # Check if it is a raw Base64 image code string
                if raw_val.startswith('data:image') or ';base64,' in raw_val:
                    if raw_val.startswith('/data:image'):
                        raw_val = raw_val.lstrip('/')
                    scan[key] = raw_val
                # If it is a standard storage disk path text string folder reference
                else:
                    path_str = raw_val.replace('\\', '/')
                    if not path_str.startswith('/'):
                        path_str = '/' + path_str
                    scan[key] = path_str
            else:
                scan[key] = None

    total_scans_count = len(all_scans)
    grouped_history = {}
    
    # 🟢 2. GROUP HISTORY & CALCULATE COMPLIANCE PER DAY UNIQUE SCANS
    for scan in all_scans:
        ts = scan.get('Qr_code_scaning_time_at')
        date_str = str(ts.date() if hasattr(ts, 'date') else str(ts).split()[0])
        if date_str not in grouped_history:
            grouped_history[date_str] = []
        grouped_history[date_str].append(scan)

    # 🟢 3. BUILD DAILY ATTENDANCE STATUS MAP
    daily_attendance_statuses = {}
    for date_key, scans_list in grouped_history.items():
        unique_checkpoints_scanned_today = set()
        
        for s in scans_list:
            detail_text = str(s.get('Qr_code_scaning_detail') or '').strip()
            # Extract checkpoint string tag identifier e.g. "CHECKPOINT:Node name"
            if "CHECKPOINT:" in detail_text:
                try:
                    point_token = detail_text.split("CHECKPOINT:")[1].split("|")[0].strip()
                    unique_checkpoints_scanned_today.add(point_token)
                except Exception:
                    pass
        
        # If unique scans meet or exceed configured checkpoint limits, mark PRESENT
        if allocated_count > 0 and len(unique_checkpoints_scanned_today) >= allocated_count:
            daily_attendance_statuses[date_key] = "PRESENT"
        else:
            daily_attendance_statuses[date_key] = "ABSENT"
        
    cursor.close(); conn.close()
    return render_template('user_view.html', 
                           current_report=base_report, 
                           total_count=total_scans_count, 
                           timeline=grouped_history,
                           allocated_count=allocated_count,
                           daily_status=daily_attendance_statuses) # <-- Passed to Template Engine


@app.route('/admin/delete_report/<int:report_id>', methods=['POST'])
def delete_report_entry(report_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Unauthorized Context Boundary Bypass.'}), 401
    conn = None; cursor = None
    try:
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT report_id FROM user_report WHERE report_id = %s", (report_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'message': 'Target ledger entry not found.'}), 404
        cursor.execute("DELETE FROM user_report WHERE report_id = %s", (report_id,))
        conn.commit()
        return jsonify({'success': True, 'message': f'Report #{report_id} dropped completely.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Database sync error: {str(e)}'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# 🟢 NEW SECURE CHANNEL: Revokes a sub-administrator configuration from the platform completely
@app.route('/admin/delete_sub_admin/<string:admin_id>', methods=['POST'])
def drop_sub_administrative_authorization(admin_id):
    if not session.get('admin_logged_in') or session.get('admin_plant') != 'ALL':
        return jsonify({'success': False, 'message': 'Root permission level unverified.'}), 401
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM admins WHERE username = %s", (admin_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Administrator credential profile revoked.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close(); conn.close()

# 🟢 NEW SECURE CHANNEL: Blocks or unlocks sub-administrator authorization state tags in the database rows
@app.route('/admin/toggle_admin_block/<string:admin_id>', methods=['POST'])
def toggle_administrative_node_blocking(admin_id):
    if not session.get('admin_logged_in') or session.get('admin_plant') != 'ALL':
        return jsonify({'success': False, 'message': 'Root permission level unverified.'}), 401
        
    target_status = (request.json or {}).get('status', 'BLOCKED')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Note: If your system uses a dedicated column on the admin layer, it maps directly here
        cursor.execute("UPDATE admins SET status = %s WHERE username = %s", (target_status, admin_id))
        conn.commit()
        return jsonify({'success': True, 'message': f'Admin profile status altered to {target_status}.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close(); conn.close()


@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        user_id = request.form['user_id'].strip().upper()
        security_answer = request.form['security_answer'].strip().lower()
        new_password = request.form['new_password'].strip()
        conn = get_db_connection(); cursor = conn.cursor(dictionary=False)
        cursor.execute("SELECT * FROM users WHERE UPPER(user_id) = %s", (user_id,))
        user_row = cursor.fetchone()
        if user_row:
            cleaned_row_cells = [str(cell).strip().lower() for cell in user_row if cell is not None]
            is_verified_match = False
            for cell in cleaned_row_cells:
                if cell == security_answer or security_answer in cell or cell in security_answer:
                    if cell != user_id.lower() and cell != new_password.lower():
                        is_verified_match = True
                        break
            if is_verified_match:
                cursor.execute("UPDATE users SET password = %s WHERE UPPER(user_id) = %s", (new_password, user_id))
                conn.commit()
                rows_affected = cursor.rowcount
                cursor.close(); conn.close()
                if rows_affected > 0:
                    return redirect(url_for('login', reset_success=1))
                else:
                    return render_template('forgot_password.html', scope='worker', modal_error="Database error: Password not changed.")
            else:
                cursor.close(); conn.close()
                return render_template('forgot_password.html', scope='worker', modal_error="Verification failed.")
        else:
            cursor.close(); conn.close()
            return render_template('forgot_password.html', scope='worker', modal_error="Worker record not found.")
    return render_template('forgot_password.html', scope='worker')
       
@app.route('/admin/forgot_password', methods=['GET', 'POST'])
def admin_forgot_password():
    if request.method == 'POST':
        username = request.form['username'].strip()
        target_plant = request.form['plant_id'].strip().upper()
        new_password = request.form['new_password']
        conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM admins WHERE username = %s AND plant_id = %s", (username, target_plant))
        admin = cursor.fetchone()
        if admin:
            cursor.execute("UPDATE admins SET password = %s WHERE username = %s", (new_password, username))
            conn.commit(); cursor.close(); conn.close()
            return redirect(url_for('admin_login', reset_success=1))
        else:
            cursor.close(); conn.close()
            return render_template('forgot_password.html', scope='admin', modal_error="Identity metrics unverified.")
    return render_template('forgot_password.html', scope='admin')
from datetime import date

# =====================================================================
# 📊 FIXED ROUTE: Worker Attendance Verification Report Engine
# =====================================================================
@app.route('/admin/attendance/<string:user_id>', methods=['GET', 'POST'])
def check_worker_attendance(user_id):
    if not session.get('admin_logged_in'): 
        return redirect(url_for('admin_login'))
    selected_date = request.args.get('filter_date') or request.form.get('filter_date')
    if not selected_date:
        selected_date = date.today().strftime('%Y-%m-%d')
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_name, plant_name, plant_id FROM users WHERE user_id = %s", (user_id,))
        worker_profile = cursor.fetchone()
        if not worker_profile:
            cursor.close(); conn.close()
            return "Error Context: Selected Worker ID does not exist in the database roster.", 404
        target_plant = worker_profile['plant_id']
        cursor.execute("SELECT point_name FROM checkpoints WHERE plant_id = %s", (target_plant,))
        required_checkpoints_rows = cursor.fetchall()
        required_set = {row['point_name'].strip() for row in required_checkpoints_rows}
        query_scanned = """
            SELECT Qr_code_scaning_detail 
            FROM user_report 
            WHERE user_id = %s AND DATE(Qr_code_scaning_time_at) = %s
        """
        cursor.execute(query_scanned, (user_id, selected_date))
        scanned_rows = cursor.fetchall()
        scanned_set = set()
        for row in scanned_rows:
            raw_detail = str(row['Qr_code_scaning_detail']).strip()
            scanned_set.add(raw_detail)
            
        missing_checkpoints = required_set - scanned_set
        if len(required_set) == 0:
            attendance_status = "No Checkpoints Configured"
            is_present = False
        elif len(missing_checkpoints) == 0:
            attendance_status = "PRESENT"
            is_present = True
        else:
            attendance_status = "ABSENT"
            is_present = False
        evaluation_payload = {
            'user_id': user_id, 'user_name': worker_profile['user_name'], 'plant_name': worker_profile['plant_name'],
            'date': selected_date, 'total_required': len(required_set), 'total_scanned': len(scanned_set),
            'status': attendance_status, 'is_present': is_present, 'missing_list': list(missing_checkpoints),
            'scanned_list': list(scanned_set), 'required_list': list(required_set)
        }
        cursor.close(); conn.close()
        return render_template('attendance_sheet.html', data=evaluation_payload)
    except Exception as e:
        if cursor: cursor.close()
        if conn: conn.close()
        return f"System Exception Drop: Code Execution Aborted. Detail: {str(e)}", 500


# =====================================================================
# 🗑️ FIXED ROUTE: Worker Profile Record Deletion Hook
# =====================================================================
@app.route('/admin/delete_worker/<string:user_id>', methods=['POST'])
def delete_worker_entry(user_id):
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Unauthorized context.'}), 401
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Worker account deleted successfully.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        cursor.close(); conn.close()


@app.route('/admin/toggle_block/<string:user_id>', methods=['POST'])
def toggle_worker_blocking_state(user_id):
    """
    Administrative Security Rule Layer: 
    Intercepts dynamic JSON parameter strings ('BLOCKED' or 'ACTIVE') and commits
    them straight onto the target profile context cells inside your database repository.
    """
    if not session.get('admin_logged_in'):
        return jsonify({'success': False, 'message': 'Unauthorized security context bypass blocked.'}), 401
        
    request_data = request.json or {}
    target_status = request_data.get('status', 'BLOCKED').strip().upper()
    
    if target_status not in ['ACTIVE', 'BLOCKED']:
        return jsonify({'success': False, 'message': 'Invalid status token configuration variable.'}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Executes verification query to check if target entity row matches an actual user trace profile
        cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'message': f'Worker account profile index #{user_id} not found.'}), 404
            
        # Forces explicit overwrite modifier payload save onto row parameters cell arrays
        cursor.execute("UPDATE users SET status = %s WHERE user_id = %s", (target_status, user_id))
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Worker profile index state updated to {target_status} completely.'
        }), 200
        
    except Exception as database_exception:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Database pipeline write fault exception: {str(database_exception)}'}), 500
        
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()


@app.route('/logout')
def logout():
    session.clear(); return redirect(url_for('login'))


# --- SERVER BOOT CONFIGURATION BLOCK ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
