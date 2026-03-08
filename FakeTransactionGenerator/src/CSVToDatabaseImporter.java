import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Statement;

public class CSVToDatabaseImporter {

    private static final String DB_URL = "jdbc:sqlite:transactions.db";

    public static void main(String[] args) {
        createTable();
        clearTable();        // optional but prevents duplicates
        importCSV("transactions2.csv");
    }

    private static Connection connect() throws Exception {
        return DriverManager.getConnection(DB_URL);
    }

    private static void createTable() {
        try (Connection conn = connect();
             Statement stmt = conn.createStatement()) {

            String sql = """
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id INTEGER,
                    card_number TEXT,
                    timestamp TEXT,
                    merchant TEXT,
                    location TEXT,
                    amount REAL,
                    is_potential_fraud INTEGER
                );
            """;

            stmt.execute(sql);
            System.out.println("Table ready.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void clearTable() {
        try (Connection conn = connect();
             Statement stmt = conn.createStatement()) {

            stmt.execute("DELETE FROM transactions;");
            System.out.println("Old data cleared.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void importCSV(String filePath) {

        String insertSQL = """
            INSERT INTO transactions
            (transaction_id, card_number, timestamp, merchant, location, amount, is_potential_fraud)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """;

        try (Connection conn = connect();
             PreparedStatement pstmt = conn.prepareStatement(insertSQL);
             BufferedReader br = new BufferedReader(new FileReader(filePath))) {

            br.readLine(); // skip header

            String line;

            while ((line = br.readLine()) != null) {

                String[] data = line.split(",");

                pstmt.setInt(1, Integer.parseInt(data[0]));
                pstmt.setString(2, data[1]);
                pstmt.setString(3, data[2]);
                pstmt.setString(4, data[3]);
                pstmt.setString(5, data[4]);
                pstmt.setDouble(6, Double.parseDouble(data[5]));
                pstmt.setInt(7, Integer.parseInt(data[6]));

                pstmt.executeUpdate();
            }

            System.out.println("CSV imported into database.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}